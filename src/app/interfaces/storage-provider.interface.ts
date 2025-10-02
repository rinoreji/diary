import { DiaryEntry } from './diary-entry.interface';
import { DeltaEntry } from '../services/version-manager.service';

export interface StorageProvider {
  /**
   * Initialize the storage provider
   */
  initialize(accessToken: string): Promise<void>;

  /**
   * Save an entry with its version information
   */
  saveEntry(accessToken: string, entry: DiaryEntry, versionEntry: DeltaEntry): Promise<void>;

  /**
   * Get all current entries (latest versions only)
   */
  getCurrentEntries(accessToken: string): Promise<DiaryEntry[]>;

  /**
   * Get version history for a specific entry
   */
  getEntryVersionHistory(accessToken: string, entryId: string): Promise<DiaryEntry[]>;

  /**
   * Get storage statistics for an entry or all entries
   */
  getStorageStats(accessToken: string, entryId?: string): Promise<{
    totalVersions: number;
    baselines: number;
    deltas: number;
    totalSize: number;
    averageDeltaSize: number;
    compressionRatio: number;
  }>;

  /**
   * Delete an entry and all its versions
   */
  deleteEntry(accessToken: string, entryId: string): Promise<void>;

  /**
   * Test connectivity to the storage provider
   */
  testConnectivity(accessToken: string): Promise<boolean>;

  /**
   * Optimize storage for an entry (optional)
   */
  optimizeEntry?(accessToken: string, entryId: string): Promise<{
    optimized: boolean;
    spaceSaved?: number;
  }>;

  /**
   * Clear all data (for testing/reset)
   */
  clearAllData?(accessToken: string): Promise<void>;
}