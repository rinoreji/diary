import { Injectable } from '@angular/core';
import { DiaryEntry, DiaryEntryWithStats, AppDataStats, Category, CategoryStats } from '../interfaces/diary-entry.interface';
import { StorageProvider } from '../interfaces/storage-provider.interface';
import { VersionManagerService } from './version-manager.service';
import { DEFAULT_CATEGORIES, UNCATEGORIZED_CATEGORY } from '../constants/categories.constants';

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
        categoriesCount: 0,
        entriesByCategory: {},
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

    // Calculate category statistics
    const entriesByCategory: { [category: string]: number } = {};
    entries.forEach(entry => {
      const category = entry.category || 'uncategorized';
      entriesByCategory[category] = (entriesByCategory[category] || 0) + 1;
    });

    return {
      totalEntries: entries.length,
      totalVersions,
      totalStorageSize,
      averageCompressionRatio: entries.length > 0 ? totalCompressionRatio / entries.length : 0,
      mostActiveEntry,
      categoriesCount: Object.keys(entriesByCategory).length,
      entriesByCategory,
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

  /**
   * Get all available categories
   */
  getCategories(): Category[] {
    return DEFAULT_CATEGORIES;
  }

  /**
   * Get entries filtered by category
   */
  async getEntriesByCategory(accessToken: string, category: string): Promise<DiaryEntry[]> {
    const allEntries = await this.getAllEntries(accessToken);
    return allEntries.filter(entry => entry.category === category);
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(accessToken: string): Promise<CategoryStats[]> {
    const allEntries = await this.getAllEntries(accessToken);
    const categoryMap = new Map<string, CategoryStats>();

    // Initialize with default categories
    DEFAULT_CATEGORIES.forEach(cat => {
      categoryMap.set(cat.id, {
        category: cat.id,
        entryCount: 0,
        totalVersions: 0,
        storageSize: 0,
        lastActivity: ''
      });
    });

    // Count entries by category
    for (const entry of allEntries) {
      const category = entry.category || 'uncategorized';
      let stats = categoryMap.get(category);
      
      if (!stats) {
        stats = {
          category,
          entryCount: 0,
          totalVersions: 0,
          storageSize: 0,
          lastActivity: ''
        };
        categoryMap.set(category, stats);
      }

      stats.entryCount++;
      
      // Update last activity
      if (!stats.lastActivity || entry.updatedAt > stats.lastActivity) {
        stats.lastActivity = entry.updatedAt;
      }
    }

    return Array.from(categoryMap.values());
  }

  /**
   * Search entries within a specific category
   */
  async searchInCategory(accessToken: string, searchTerm: string, category: string): Promise<DiaryEntry[]> {
    const categoryEntries = await this.getEntriesByCategory(accessToken, category);
    if (!searchTerm.trim()) {
      return categoryEntries;
    }

    const searchLower = searchTerm.toLowerCase();
    return categoryEntries.filter(entry =>
      entry.text.toLowerCase().includes(searchLower) ||
      entry.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
    );
  }

  /**
   * Get entries with specific tags
   */
  async getEntriesByTags(accessToken: string, tags: string[]): Promise<DiaryEntry[]> {
    const allEntries = await this.getAllEntries(accessToken);
    return allEntries.filter(entry =>
      entry.tags?.some((tag: string) => tags.includes(tag))
    );
  }

  /**
   * Get all unique tags across all entries
   */
  async getAllTags(accessToken: string): Promise<string[]> {
    const allEntries = await this.getAllEntries(accessToken);
    const tagSet = new Set<string>();
    
    allEntries.forEach(entry => {
      entry.tags?.forEach((tag: string) => tagSet.add(tag));
    });

    return Array.from(tagSet).sort();
  }
}