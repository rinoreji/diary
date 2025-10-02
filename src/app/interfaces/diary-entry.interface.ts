export interface DiaryEntry {
  uniqueId: string;
  text: string;
  category: string;
  tags?: string[];
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
  categoriesCount: number;
  entriesByCategory: { [category: string]: number };
  recentEntries: DiaryEntry[];
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt: string;
  isDefault: boolean;
}

export interface CategoryStats {
  category: string;
  entryCount: number;
  totalVersions: number;
  storageSize: number;
  lastActivity: string;
}