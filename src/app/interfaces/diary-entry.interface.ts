export interface DiaryEntry {
  uniqueId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface DiaryEntryWithStats {
  entry: DiaryEntry;
  totalVersions: number;
  storageSize: number;
  compressionRatio: number;
  lastModified: string;
}

export interface AppDataStats {
  totalEntries: number;
  totalVersions: number;
  totalStorageSize: number;
  averageCompressionRatio: number;
  mostActiveEntry: string;
  recentEntries: DiaryEntry[];
}