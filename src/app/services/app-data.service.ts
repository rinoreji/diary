import { Injectable } from '@angular/core';
import { DiaryEntry, DiaryEntryWithStats, AppDataStats } from '../interfaces/diary-entry.interface';
import { StorageProvider } from '../interfaces/storage-provider.interface';
import { VersionManagerService } from './version-manager.service';

@Injectable({
  providedIn: 'root'
})
export class AppDataService {
  private storageProvider: StorageProvider | null = null;
  private currentUserId: string = '';

  constructor(private versionManager: VersionManagerService) {}

  /**
   * Set the storage provider (Google Sheets, Notion, etc.)
   */
  setStorageProvider(provider: StorageProvider): void {
    this.storageProvider = provider;
  }

  /**
   * Set current user context
   */
  setUser(userId: string): void {
    this.currentUserId = userId;
  }

  /**
   * Initialize app data storage
   */
  async initialize(accessToken: string): Promise<void> {
    if (!this.storageProvider) {
      throw new Error('Storage provider not set');
    }
    await this.storageProvider.initialize(accessToken);
  }

  /**
   * Save a diary entry with version management
   */
  async saveEntry(accessToken: string, entry: DiaryEntry, previousText: string = ''): Promise<void> {
    if (!this.storageProvider) {
      throw new Error('Storage provider not set');
    }

    // Create version entry with delta compression
    const versionEntry = this.versionManager.createVersion(
      entry.uniqueId,
      entry.text,
      previousText,
      entry.version
    );

    // Save through storage provider
    await this.storageProvider.saveEntry(accessToken, entry, versionEntry);
  }

  /**
   * Get all current diary entries (latest versions only)
   */
  async getAllEntries(accessToken: string): Promise<DiaryEntry[]> {
    if (!this.storageProvider) {
      throw new Error('Storage provider not set');
    }
    return await this.storageProvider.getCurrentEntries(accessToken);
  }

  /**
   * Get a specific entry by ID
   */
  async getEntry(accessToken: string, entryId: string): Promise<DiaryEntry | null> {
    const entries = await this.getAllEntries(accessToken);
    return entries.find(e => e.uniqueId === entryId) || null;
  }

  /**
   * Get version history for an entry
   */
  async getEntryVersions(accessToken: string, entryId: string): Promise<DiaryEntry[]> {
    if (!this.storageProvider) {
      throw new Error('Storage provider not set');
    }
    return await this.storageProvider.getEntryVersionHistory(accessToken, entryId);
  }

  /**
   * Get entry with detailed statistics
   */
  async getEntryWithStats(accessToken: string, entryId: string): Promise<DiaryEntryWithStats | null> {
    if (!this.storageProvider) {
      throw new Error('Storage provider not set');
    }

    const entry = await this.getEntry(accessToken, entryId);
    if (!entry) return null;

    const stats = await this.storageProvider.getStorageStats(accessToken, entryId);
    const versions = await this.getEntryVersions(accessToken, entryId);

    return {
      entry,
      totalVersions: stats.totalVersions,
      storageSize: stats.totalSize,
      compressionRatio: stats.compressionRatio,
      lastModified: entry.updatedAt
    };
  }

  /**
   * Delete an entry and all its versions
   */
  async deleteEntry(accessToken: string, entryId: string): Promise<void> {
    if (!this.storageProvider) {
      throw new Error('Storage provider not set');
    }
    await this.storageProvider.deleteEntry(accessToken, entryId);
  }

  /**
   * Search entries by text content
   */
  async searchEntries(accessToken: string, query: string): Promise<DiaryEntry[]> {
    const allEntries = await this.getAllEntries(accessToken);
    const lowercaseQuery = query.toLowerCase();
    
    return allEntries.filter(entry => 
      entry.text.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Get entries within a date range
   */
  async getEntriesByDateRange(
    accessToken: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<DiaryEntry[]> {
    const allEntries = await this.getAllEntries(accessToken);
    
    return allEntries.filter(entry => {
      const entryDate = new Date(entry.updatedAt);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }

  /**
   * Get comprehensive app statistics
   */
  async getAppStats(accessToken: string): Promise<AppDataStats> {
    if (!this.storageProvider) {
      throw new Error('Storage provider not set');
    }

    const entries = await this.getAllEntries(accessToken);
    
    if (entries.length === 0) {
      return {
        totalEntries: 0,
        totalVersions: 0,
        totalStorageSize: 0,
        averageCompressionRatio: 0,
        mostActiveEntry: '',
        recentEntries: []
      };
    }

    let totalVersions = 0;
    let totalStorageSize = 0;
    let totalCompressionRatio = 0;
    let mostActiveEntry = '';
    let maxVersions = 0;

    // Calculate stats for each entry
    for (const entry of entries) {
      const stats = await this.storageProvider.getStorageStats(accessToken, entry.uniqueId);
      totalVersions += stats.totalVersions;
      totalStorageSize += stats.totalSize;
      totalCompressionRatio += stats.compressionRatio;

      if (stats.totalVersions > maxVersions) {
        maxVersions = stats.totalVersions;
        mostActiveEntry = entry.uniqueId;
      }
    }

    // Get recent entries (last 5)
    const recentEntries = entries
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);

    return {
      totalEntries: entries.length,
      totalVersions,
      totalStorageSize,
      averageCompressionRatio: entries.length > 0 ? totalCompressionRatio / entries.length : 0,
      mostActiveEntry,
      recentEntries
    };
  }

  /**
   * Export all data for backup
   */
  async exportAllData(accessToken: string): Promise<{
    entries: DiaryEntry[];
    versions: { [entryId: string]: DiaryEntry[] };
    metadata: AppDataStats;
  }> {
    const entries = await this.getAllEntries(accessToken);
    const versions: { [entryId: string]: DiaryEntry[] } = {};

    // Get version history for each entry
    for (const entry of entries) {
      versions[entry.uniqueId] = await this.getEntryVersions(accessToken, entry.uniqueId);
    }

    const metadata = await this.getAppStats(accessToken);

    return {
      entries,
      versions,
      metadata
    };
  }

  /**
   * Import data from backup
   */
  async importData(
    accessToken: string, 
    data: {
      entries: DiaryEntry[];
      versions: { [entryId: string]: DiaryEntry[] };
    }
  ): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    for (const entry of data.entries) {
      try {
        const entryVersions = data.versions[entry.uniqueId] || [];
        
        // Import all versions in order
        for (const version of entryVersions.sort((a, b) => a.version - b.version)) {
          const previousVersion = entryVersions.find(v => v.version === version.version - 1);
          const previousText = previousVersion ? previousVersion.text : '';
          
          await this.saveEntry(accessToken, version, previousText);
        }
        
        imported++;
      } catch (error) {
        errors.push(`Failed to import entry ${entry.uniqueId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { imported, errors };
  }

  /**
   * Optimize storage (consolidate deltas, create new baselines)
   */
  async optimizeStorage(accessToken: string): Promise<{
    optimized: number;
    spaceSaved: number;
    errors: string[];
  }> {
    if (!this.storageProvider) {
      throw new Error('Storage provider not set');
    }

    if (!this.storageProvider.optimizeEntry) {
      throw new Error('Storage provider does not support optimization');
    }

    const entries = await this.getAllEntries(accessToken);
    const errors: string[] = [];
    let optimized = 0;
    let totalSpaceSaved = 0;

    for (const entry of entries) {
      try {
        const result = await this.storageProvider.optimizeEntry!(accessToken, entry.uniqueId);
        if (result.optimized) {
          optimized++;
          totalSpaceSaved += result.spaceSaved || 0;
        }
      } catch (error) {
        errors.push(`Failed to optimize entry ${entry.uniqueId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      optimized,
      spaceSaved: totalSpaceSaved,
      errors
    };
  }

  /**
   * Test storage provider connectivity
   */
  async testConnectivity(accessToken: string): Promise<boolean> {
    if (!this.storageProvider) {
      return false;
    }
    return await this.storageProvider.testConnectivity(accessToken);
  }
}