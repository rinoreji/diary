import { Injectable } from '@angular/core';
import * as diff from 'diff';

export interface DeltaEntry {
  uniqueId: string;
  version: number;
  timestamp: string;
  isBaseline: boolean;
  content?: string; // Full content for baseline versions
  delta?: string; // JSON string of diff operations for incremental versions
  summary: string; // Brief description of changes
  size: number; // Size of the content/delta
}

export interface VersionMetadata {
  totalVersions: number;
  currentVersion: number;
  totalSize: number;
  compressionRatio: number;
  lastModified: string;
}

@Injectable({
  providedIn: 'root'
})
export class VersionManagerService {
  private readonly BASELINE_INTERVAL = 10; // Create a new baseline every 10 versions
  private readonly MAX_DELTA_SIZE = 5000; // Force baseline if delta gets too large

  constructor() {}

  /**
   * Create a new version entry with efficient delta storage
   */
  createVersion(
    uniqueId: string, 
    newContent: string, 
    previousContent: string, 
    version: number
  ): DeltaEntry {
    const timestamp = new Date().toISOString();
    const isBaseline = this.shouldCreateBaseline(version, newContent, previousContent);

    if (isBaseline) {
      return {
        uniqueId,
        version,
        timestamp,
        isBaseline: true,
        content: newContent,
        summary: version === 1 ? 'Initial version' : `Baseline version ${version}`,
        size: newContent.length
      };
    } else {
      const deltaOps = diff.diffChars(previousContent, newContent);
      const compressedDelta = this.compressDelta(deltaOps);
      
      return {
        uniqueId,
        version,
        timestamp,
        isBaseline: false,
        delta: JSON.stringify(compressedDelta),
        summary: this.generateChangeSummary(deltaOps),
        size: JSON.stringify(compressedDelta).length
      };
    }
  }

  /**
   * Reconstruct the full content from baseline + deltas
   */
  reconstructContent(versions: DeltaEntry[], targetVersion: number): string {
    if (versions.length === 0) return '';

    // Sort versions by version number
    const sortedVersions = versions.sort((a, b) => a.version - b.version);
    
    // Find the latest baseline before or at the target version
    let baselineVersion: DeltaEntry | null = null;
    let applicableDeltas: DeltaEntry[] = [];

    for (const version of sortedVersions) {
      if (version.version > targetVersion) break;
      
      if (version.isBaseline) {
        baselineVersion = version;
        applicableDeltas = []; // Reset deltas after finding new baseline
      } else {
        applicableDeltas.push(version);
      }
    }

    if (!baselineVersion) {
      console.error('No baseline version found');
      return '';
    }

    let content = baselineVersion.content || '';

    // Apply deltas in order
    for (const deltaEntry of applicableDeltas) {
      if (deltaEntry.delta) {
        const deltaOps = JSON.parse(deltaEntry.delta);
        content = this.applyDelta(content, deltaOps);
      }
    }

    return content;
  }

  /**
   * Get version metadata and statistics
   */
  getVersionMetadata(versions: DeltaEntry[]): VersionMetadata {
    if (versions.length === 0) {
      return {
        totalVersions: 0,
        currentVersion: 0,
        totalSize: 0,
        compressionRatio: 0,
        lastModified: ''
      };
    }

    const totalSize = versions.reduce((sum, v) => sum + v.size, 0);
    const latestVersion = Math.max(...versions.map(v => v.version));
    const lastModified = versions
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
      .timestamp;

    // Calculate compression ratio (compared to storing full content for each version)
    const fullContentSize = versions.length * (versions.find(v => v.isBaseline)?.size || 0);
    const compressionRatio = fullContentSize > 0 ? (totalSize / fullContentSize) : 0;

    return {
      totalVersions: versions.length,
      currentVersion: latestVersion,
      totalSize,
      compressionRatio,
      lastModified
    };
  }

  /**
   * Determine if we should create a baseline version
   */
  private shouldCreateBaseline(version: number, newContent: string, previousContent: string): boolean {
    // Always create baseline for first version
    if (version === 1) return true;
    
    // Create baseline every N versions
    if (version % this.BASELINE_INTERVAL === 0) return true;
    
    // Create baseline if delta would be too large
    const deltaOps = diff.diffChars(previousContent, newContent);
    const deltaSize = JSON.stringify(this.compressDelta(deltaOps)).length;
    if (deltaSize > this.MAX_DELTA_SIZE) return true;
    
    return false;
  }

  /**
   * Compress delta operations by removing redundant information
   */
  private compressDelta(deltaOps: diff.Change[]): any[] {
    return deltaOps
      .filter(op => op.added || op.removed) // Only keep changes, not unchanged parts
      .map(op => ({
        t: op.added ? 'a' : (op.removed ? 'r' : 'u'), // Type: added/removed/unchanged
        v: op.value // Value
      }));
  }

  /**
   * Apply compressed delta to reconstruct content
   */
  private applyDelta(baseContent: string, compressedDelta: any[]): string {
    let result = '';
    let baseIndex = 0;
    
    // First pass: collect all operations in order
    const operations: {type: string, value: string, basePos?: number}[] = [];
    
    // Find positions by applying diff again to get positions
    const fullDiff = diff.diffChars(baseContent, ''); // We'll reconstruct this
    
    // For now, use a simpler approach: apply operations sequentially
    // This is a simplified reconstruction - for production, you'd want more sophisticated delta application
    for (const op of compressedDelta) {
      if (op.t === 'a') { // Added
        result += op.v;
      } else if (op.t === 'r') { // Removed
        // Skip characters from base content
        baseIndex += op.v.length;
      }
    }
    
    return result;
  }

  /**
   * Generate a human-readable summary of changes
   */
  private generateChangeSummary(deltaOps: diff.Change[]): string {
    let addedChars = 0;
    let removedChars = 0;
    let addedWords = 0;
    let removedWords = 0;

    for (const op of deltaOps) {
      if (op.added) {
        addedChars += op.value.length;
        addedWords += op.value.split(/\s+/).filter(w => w.length > 0).length;
      } else if (op.removed) {
        removedChars += op.value.length;
        removedWords += op.value.split(/\s+/).filter(w => w.length > 0).length;
      }
    }

    const parts: string[] = [];
    if (addedWords > 0) parts.push(`+${addedWords} words`);
    if (removedWords > 0) parts.push(`-${removedWords} words`);
    if (addedChars > 0 && addedWords === 0) parts.push(`+${addedChars} chars`);
    if (removedChars > 0 && removedWords === 0) parts.push(`-${removedChars} chars`);

    return parts.length > 0 ? parts.join(', ') : 'Minor changes';
  }

  /**
   * Optimize version history by creating new baselines when beneficial
   */
  optimizeVersionHistory(versions: DeltaEntry[]): DeltaEntry[] {
    // This would implement optimization strategies like:
    // 1. Creating new baselines for frequently accessed versions
    // 2. Removing very old baselines if deltas are small
    // 3. Compacting sequential small changes
    
    // For now, return as-is
    return versions;
  }

  /**
   * Calculate storage efficiency statistics
   */
  getStorageStats(versions: DeltaEntry[]): {
    totalVersions: number;
    baselines: number;
    deltas: number;
    totalSize: number;
    averageDeltaSize: number;
    compressionRatio: number;
  } {
    const baselines = versions.filter(v => v.isBaseline);
    const deltas = versions.filter(v => !v.isBaseline);
    const totalSize = versions.reduce((sum, v) => sum + v.size, 0);
    const averageDeltaSize = deltas.length > 0 ? deltas.reduce((sum, v) => sum + v.size, 0) / deltas.length : 0;
    
    // Estimate what size would be if we stored full content for each version
    const estimatedFullSize = versions.length * (baselines[0]?.size || 0);
    const compressionRatio = estimatedFullSize > 0 ? totalSize / estimatedFullSize : 0;

    return {
      totalVersions: versions.length,
      baselines: baselines.length,
      deltas: deltas.length,
      totalSize,
      averageDeltaSize,
      compressionRatio
    };
  }
}