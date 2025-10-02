import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { StorageProvider } from '../interfaces/storage-provider.interface';
import { DiaryEntry } from '../interfaces/diary-entry.interface';
import { VersionManagerService, DeltaEntry } from './version-manager.service';

@Injectable({
  providedIn: 'root'
})
export class GoogleSheetsStorageProvider implements StorageProvider {
  private readonly DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
  private readonly SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
  private spreadsheetId: string | null = null;
  
  private readonly SPREADSHEET_NAME = 'DiaryDB';
  private readonly ENTRIES_SHEET = 'Entries';
  private readonly VERSIONS_SHEET = 'Versions';

  constructor(
    private http: HttpClient,
    private versionManager: VersionManagerService
  ) {}

  async initialize(accessToken: string): Promise<void> {
    console.log('Initializing Google Sheets storage...');
    console.log('Access token length:', accessToken ? accessToken.length : 'No token');
    
    const headers = { 
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
    
    const params = {
      q: `name='${this.SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet'`,
      fields: 'files(id, name)'
    };

    try {
      console.log('Making request to:', this.DRIVE_API_URL);
      console.log('Headers:', headers);
      console.log('Params:', params);
      
      const response: any = await firstValueFrom(this.http.get(this.DRIVE_API_URL, { headers, params }));
      console.log('Drive API response:', response);
      
      if (response.files && response.files.length > 0) {
        this.spreadsheetId = response.files[0].id;
        console.log('Found existing spreadsheet:', this.spreadsheetId);
      } else {
        console.log('Creating new efficient spreadsheet...');
        await this.createSpreadsheet(accessToken);
      }
    } catch (error) {
      console.error('Error initializing Google Sheets storage:', error);
      throw error;
    }
  }

  private async createSpreadsheet(accessToken: string): Promise<void> {
    const requestBody = {
      properties: { title: this.SPREADSHEET_NAME },
      sheets: [
        {
          properties: {
            title: this.ENTRIES_SHEET,
            gridProperties: { rowCount: 1000, columnCount: 7 }
          }
        },
        {
          properties: {
            title: this.VERSIONS_SHEET,
            gridProperties: { rowCount: 10000, columnCount: 9 }
          }
        }
      ]
    };

    const headers = { 
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    try {
      const response: any = await firstValueFrom(this.http.post(this.SHEETS_API_URL, requestBody, { headers }));
      this.spreadsheetId = response.spreadsheetId;
      console.log('Created spreadsheet:', this.spreadsheetId);
      
      await this.setupHeaders(accessToken);
    } catch (error) {
      console.error('Error creating spreadsheet:', error);
      throw error;
    }
  }

  private async setupHeaders(accessToken: string): Promise<void> {
    if (!this.spreadsheetId) return;

    const entriesHeaders = [
      'Entry ID', 'Current Text', 'Created At', 'Updated At', 
      'Current Version', 'Total Versions', 'Storage Size'
    ];

    const versionsHeaders = [
      'Entry ID', 'Version', 'Timestamp', 'Is Baseline', 
      'Content', 'Delta', 'Summary', 'Size', 'Compression Ratio'
    ];

    try {
      await this.setSheetHeaders(accessToken, this.ENTRIES_SHEET, entriesHeaders);
      await this.setSheetHeaders(accessToken, this.VERSIONS_SHEET, versionsHeaders);
      console.log('Headers set up successfully');
    } catch (error) {
      console.error('Error setting up headers:', error);
    }
  }

  private async setSheetHeaders(accessToken: string, sheetName: string, headers: string[]): Promise<void> {
    if (!this.spreadsheetId) return;

    const range = `${sheetName}!A1:${String.fromCharCode(65 + headers.length - 1)}1`;
    const url = `${this.SHEETS_API_URL}/${this.spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
    
    const body = { values: [headers] };
    const requestHeaders = { 
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    await firstValueFrom(this.http.put(url, body, { headers: requestHeaders }));
  }

  async saveEntry(accessToken: string, entry: DiaryEntry, versionEntry: DeltaEntry): Promise<void> {
    if (!this.spreadsheetId) {
      throw new Error('Spreadsheet not initialized');
    }

    try {
      // Save version entry
      await this.saveVersionEntry(accessToken, versionEntry);
      
      // Update or create current entry
      await this.updateCurrentEntry(accessToken, entry);
      
      console.log(`Entry ${entry.uniqueId} v${entry.version} saved successfully`);
    } catch (error) {
      console.error('Error saving entry:', error);
      throw error;
    }
  }

  private async saveVersionEntry(accessToken: string, versionEntry: DeltaEntry): Promise<void> {
    if (!this.spreadsheetId) return;

    const values = [
      versionEntry.uniqueId,
      versionEntry.version.toString(),
      versionEntry.timestamp,
      versionEntry.isBaseline.toString(),
      versionEntry.content || '',
      versionEntry.delta || '',
      versionEntry.summary,
      versionEntry.size.toString(),
      '' // Compression ratio calculated later
    ];

    const url = `${this.SHEETS_API_URL}/${this.spreadsheetId}/values/${this.VERSIONS_SHEET}:append?valueInputOption=USER_ENTERED`;
    const body = { values: [values] };
    const headers = { 
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    await firstValueFrom(this.http.post(url, body, { headers }));
  }

  private async updateCurrentEntry(accessToken: string, entry: DiaryEntry): Promise<void> {
    if (!this.spreadsheetId) return;

    // Remove existing entry for this ID first
    await this.removeCurrentEntry(accessToken, entry.uniqueId);

    // Get stats for this entry
    const versionCount = await this.getVersionCount(accessToken, entry.uniqueId);
    const storageSize = await this.getEntryStorageSize(accessToken, entry.uniqueId);

    const values = [
      entry.uniqueId,
      entry.text,
      entry.createdAt,
      entry.updatedAt,
      entry.version.toString(),
      versionCount.toString(),
      storageSize.toString()
    ];

    const url = `${this.SHEETS_API_URL}/${this.spreadsheetId}/values/${this.ENTRIES_SHEET}:append?valueInputOption=USER_ENTERED`;
    const body = { values: [values] };
    const headers = { 
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    await firstValueFrom(this.http.post(url, body, { headers }));
  }

  private async removeCurrentEntry(accessToken: string, entryId: string): Promise<void> {
    // This would involve finding and deleting the specific row
    // For simplicity, we'll let duplicates exist and filter on read
    // In production, you'd implement proper row deletion
  }

  async getCurrentEntries(accessToken: string): Promise<DiaryEntry[]> {
    if (!this.spreadsheetId) return [];

    try {
      const url = `${this.SHEETS_API_URL}/${this.spreadsheetId}/values/${this.ENTRIES_SHEET}!A:G`;
      const headers = { Authorization: `Bearer ${accessToken}` };
      
      const response: any = await firstValueFrom(this.http.get(url, { headers }));
      const rows = response.values || [];
      
      if (rows.length <= 1) return [];

      const entriesMap = new Map<string, DiaryEntry>();

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length >= 5) {
          const entry: DiaryEntry = {
            uniqueId: row[0],
            text: row[1],
            createdAt: row[2],
            updatedAt: row[3],
            version: parseInt(row[4]) || 1
          };
          
          // Keep only the latest version for each entry
          const existing = entriesMap.get(entry.uniqueId);
          if (!existing || entry.version > existing.version) {
            entriesMap.set(entry.uniqueId, entry);
          }
        }
      }

      return Array.from(entriesMap.values())
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      console.error('Error getting current entries:', error);
      return [];
    }
  }

  async getEntryVersionHistory(accessToken: string, entryId: string): Promise<DiaryEntry[]> {
    const versionEntries = await this.getVersionEntries(accessToken, entryId);
    const reconstructedVersions: DiaryEntry[] = [];

    for (const versionEntry of versionEntries.sort((a, b) => a.version - b.version)) {
      const reconstructedText = this.versionManager.reconstructContent(
        versionEntries.filter(v => v.version <= versionEntry.version),
        versionEntry.version
      );

      reconstructedVersions.push({
        uniqueId: versionEntry.uniqueId,
        text: reconstructedText,
        createdAt: versionEntry.timestamp,
        updatedAt: versionEntry.timestamp,
        version: versionEntry.version
      });
    }

    return reconstructedVersions.sort((a, b) => b.version - a.version);
  }

  private async getVersionEntries(accessToken: string, entryId: string): Promise<DeltaEntry[]> {
    if (!this.spreadsheetId) return [];

    try {
      const url = `${this.SHEETS_API_URL}/${this.spreadsheetId}/values/${this.VERSIONS_SHEET}!A:I`;
      const headers = { Authorization: `Bearer ${accessToken}` };
      
      const response: any = await firstValueFrom(this.http.get(url, { headers }));
      const rows = response.values || [];
      
      if (rows.length <= 1) return [];

      const versionEntries: DeltaEntry[] = [];
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length >= 8 && row[0] === entryId) {
          const versionEntry: DeltaEntry = {
            uniqueId: row[0],
            version: parseInt(row[1]) || 1,
            timestamp: row[2],
            isBaseline: row[3] === 'true',
            summary: row[6],
            size: parseInt(row[7]) || 0
          };

          if (versionEntry.isBaseline) {
            versionEntry.content = row[4];
          } else {
            versionEntry.delta = row[5];
          }

          versionEntries.push(versionEntry);
        }
      }

      return versionEntries;
    } catch (error) {
      console.error('Error getting version entries:', error);
      return [];
    }
  }

  async getStorageStats(accessToken: string, entryId?: string): Promise<{
    totalVersions: number;
    baselines: number;
    deltas: number;
    totalSize: number;
    averageDeltaSize: number;
    compressionRatio: number;
  }> {
    const versionEntries = entryId 
      ? await this.getVersionEntries(accessToken, entryId)
      : await this.getAllVersionEntries(accessToken);

    return this.versionManager.getStorageStats(versionEntries);
  }

  private async getAllVersionEntries(accessToken: string): Promise<DeltaEntry[]> {
    if (!this.spreadsheetId) return [];

    try {
      const url = `${this.SHEETS_API_URL}/${this.spreadsheetId}/values/${this.VERSIONS_SHEET}!A:I`;
      const headers = { Authorization: `Bearer ${accessToken}` };
      
      const response: any = await firstValueFrom(this.http.get(url, { headers }));
      const rows = response.values || [];
      
      const allVersions: DeltaEntry[] = [];
      
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length >= 8) {
          const versionEntry: DeltaEntry = {
            uniqueId: row[0],
            version: parseInt(row[1]) || 1,
            timestamp: row[2],
            isBaseline: row[3] === 'true',
            summary: row[6],
            size: parseInt(row[7]) || 0
          };

          if (versionEntry.isBaseline) {
            versionEntry.content = row[4];
          } else {
            versionEntry.delta = row[5];
          }

          allVersions.push(versionEntry);
        }
      }

      return allVersions;
    } catch (error) {
      console.error('Error getting all version entries:', error);
      return [];
    }
  }

  async deleteEntry(accessToken: string, entryId: string): Promise<void> {
    // This would require finding and deleting specific rows
    // Implementation would depend on Google Sheets API batch operations
    console.log(`Delete entry ${entryId} - implementation needed`);
  }

  async testConnectivity(accessToken: string): Promise<boolean> {
    if (!this.spreadsheetId) return false;

    try {
      const url = `${this.SHEETS_API_URL}/${this.spreadsheetId}`;
      const headers = { Authorization: `Bearer ${accessToken}` };
      await firstValueFrom(this.http.get(url, { headers }));
      return true;
    } catch (error) {
      console.error('Connectivity test failed:', error);
      return false;
    }
  }

  async clearAllData(accessToken: string): Promise<void> {
    if (!this.spreadsheetId) return;

    try {
      // Clear both sheets
      await this.clearSheet(accessToken, this.ENTRIES_SHEET);
      await this.clearSheet(accessToken, this.VERSIONS_SHEET);
      
      // Reset headers
      await this.setupHeaders(accessToken);
      
      console.log('All data cleared successfully');
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  private async clearSheet(accessToken: string, sheetName: string): Promise<void> {
    if (!this.spreadsheetId) return;

    const range = `${sheetName}!A2:Z1000`; // Clear all data except headers
    const url = `${this.SHEETS_API_URL}/${this.spreadsheetId}/values/${range}:clear`;
    const headers = { 
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    await firstValueFrom(this.http.post(url, {}, { headers }));
  }

  private async getVersionCount(accessToken: string, entryId: string): Promise<number> {
    const versions = await this.getVersionEntries(accessToken, entryId);
    return versions.length;
  }

  private async getEntryStorageSize(accessToken: string, entryId: string): Promise<number> {
    const versions = await this.getVersionEntries(accessToken, entryId);
    return versions.reduce((sum, v) => sum + v.size, 0);
  }
}