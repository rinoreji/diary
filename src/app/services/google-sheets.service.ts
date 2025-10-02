import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface DiaryEntry {
  uniqueId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

@Injectable({
  providedIn: 'root'
})
export class GoogleSheetsService {
  private readonly DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
  private readonly SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
  private spreadsheetId: string | null = null;

  constructor(private http: HttpClient) {}

  // Ensure the 'Diary' spreadsheet exists
  async ensureDiarySpreadsheet(accessToken: string): Promise<void> {
    console.log('ensureDiarySpreadsheet called with token:', accessToken ? 'Present' : 'Missing');
    
    const headers = { Authorization: `Bearer ${accessToken}` };
    const params = {
      q: "name='Diary' and mimeType='application/vnd.google-apps.spreadsheet'",
      fields: 'files(id, name)'
    };

    console.log('Searching for existing Diary spreadsheet...');
    
    try {
      const response: any = await this.http.get(this.DRIVE_API_URL, { headers, params }).toPromise();
      console.log('Drive API response:', response);
      
      if (response.files && response.files.length > 0) {
        this.spreadsheetId = response.files[0].id;
        console.log('Spreadsheet found:', this.spreadsheetId);
      } else {
        console.log('No existing spreadsheet found, creating new one...');
        await this.createDiarySpreadsheet(accessToken);
      }
    } catch (error) {
      console.error('Error in ensureDiarySpreadsheet:', error);
      throw error;
    }
  }

  // Create the 'Diary' spreadsheet with proper headers
  private async createDiarySpreadsheet(accessToken: string): Promise<void> {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const body = {
      properties: { title: 'Diary' }
    };

    const response: any = await this.http.post(this.SHEETS_API_URL, body, { headers }).toPromise();
    this.spreadsheetId = response.spreadsheetId;
    console.log('Spreadsheet created:', this.spreadsheetId);
    
    // Add headers to the first row
    await this.addHeaders(accessToken);
  }

  // Add headers to the spreadsheet
  private async addHeaders(accessToken: string): Promise<void> {
    if (!this.spreadsheetId) return;

    const url = `${this.SHEETS_API_URL}/${this.spreadsheetId}/values/A1:F1?valueInputOption=USER_ENTERED`;
    const body = {
      values: [['Entry ID', 'Text', 'Created At', 'Updated At', 'Version', 'Is Current']]
    };
    const headers = {
      Authorization: `Bearer ${accessToken}`
    };

    this.http.put(url, body, { headers }).subscribe({
      next: (response) => console.log('Headers added successfully:', response),
      error: (err) => console.error('Error adding headers:', err)
    });
  }

  // Append a new row to the 'Diary' spreadsheet with versioning
  appendRow(accessToken: string, entry: DiaryEntry): void {
    console.log('appendRow called with entry:', entry);
    
    if (!this.spreadsheetId) {
      console.error('Spreadsheet ID is not set. Ensure the Diary spreadsheet exists first.');
      return;
    }

    console.log('Using spreadsheet ID:', this.spreadsheetId);
    
    const url = `${this.SHEETS_API_URL}/${this.spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`;
    const body = {
      values: [[entry.uniqueId, entry.text, entry.createdAt, entry.updatedAt, entry.version, 'TRUE']]
    };
    const headers = {
      Authorization: `Bearer ${accessToken}`
    };

    console.log('Making API call to:', url);
    console.log('Request body:', body);

    this.http.post(url, body, { headers }).subscribe({
      next: (response) => console.log('Row appended successfully:', response),
      error: (err) => console.error('Error appending row to Google Sheets:', err)
    });
  }

  // Update existing row and create version history
  async updateRow(accessToken: string, entry: DiaryEntry): Promise<void> {
    console.log('updateRow called with entry:', entry);
    
    if (!this.spreadsheetId) {
      console.error('Spreadsheet ID is not set. Ensure the Diary spreadsheet exists first.');
      return;
    }

    console.log('Using spreadsheet ID for update:', this.spreadsheetId);

    try {
      // First, mark all existing versions of this entry as not current
      console.log('Marking old versions as inactive...');
      await this.markVersionsAsOld(accessToken, entry.uniqueId);
      
      // Then append the new version
      console.log('Appending new version...');
      this.appendRow(accessToken, entry);
    } catch (error) {
      console.error('Error updating row:', error);
    }
  }

  // Mark all existing versions of an entry as not current
  private async markVersionsAsOld(accessToken: string, uniqueId: string): Promise<void> {
    if (!this.spreadsheetId) return;

    try {
      // Get all rows to find matching entries
      const allRows = await this.fetchAllRows(accessToken);
      const updates: any[] = [];

      allRows.forEach((row: any, index: number) => {
        if (row[0] === uniqueId && row[5] === 'TRUE') { // If this is the current version
          updates.push({
            range: `F${index + 2}`, // Column F (Is Current), +2 because we start from row 2
            values: [['FALSE']]
          });
        }
      });

      if (updates.length > 0) {
        const url = `${this.SHEETS_API_URL}/${this.spreadsheetId}/values:batchUpdate`;
        const body = {
          data: updates,
          valueInputOption: 'USER_ENTERED'
        };
        const headers = { Authorization: `Bearer ${accessToken}` };

        await this.http.post(url, body, { headers }).toPromise();
      }
    } catch (error) {
      console.error('Error marking versions as old:', error);
    }
  }

  // Fetch all rows from the 'Diary' spreadsheet (updated method)
  async fetchAllRows(accessToken: string): Promise<any[]> {
    if (!this.spreadsheetId) {
      console.error('Spreadsheet ID is not set. Ensure the Diary spreadsheet exists first.');
      return [];
    }

    const url = `${this.SHEETS_API_URL}/${this.spreadsheetId}/values/A2:F1000`; // Start from row 2 to skip headers
    const headers = {
      Authorization: `Bearer ${accessToken}`
    };

    try {
      const response: any = await this.http.get(url, { headers }).toPromise();
      return response.values || [];
    } catch (error) {
      console.error('Error fetching rows from Google Sheets:', error);
      return [];
    }
  }

  // Get current version of an entry
  async getCurrentEntry(accessToken: string, uniqueId: string): Promise<DiaryEntry | null> {
    const allRows = await this.fetchAllRows(accessToken);
    
    for (const row of allRows) {
      if (row[0] === uniqueId && row[5] === 'TRUE') { // Current version
        return {
          uniqueId: row[0],
          text: row[1],
          createdAt: row[2],
          updatedAt: row[3],
          version: parseInt(row[4]) || 1
        };
      }
    }
    
    return null;
  }

  // Test Google Sheets API connectivity
  async testAPIConnectivity(accessToken: string): Promise<boolean> {
    console.log('Testing Google Sheets API connectivity...');
    
    if (!this.spreadsheetId) {
      console.error('No spreadsheet ID available for testing');
      return false;
    }

    const url = `${this.SHEETS_API_URL}/${this.spreadsheetId}`;
    const headers = { Authorization: `Bearer ${accessToken}` };

    try {
      const response: any = await this.http.get(url, { headers }).toPromise();
      console.log('API connectivity test successful:', response.properties?.title);
      return true;
    } catch (error) {
      console.error('API connectivity test failed:', error);
      return false;
    }
  }

  // Get version history for an entry
  async getEntryVersions(accessToken: string, uniqueId: string): Promise<DiaryEntry[]> {
    const allRows = await this.fetchAllRows(accessToken);
    const versions: DiaryEntry[] = [];
    
    allRows.forEach((row: any) => {
      if (row[0] === uniqueId) {
        versions.push({
          uniqueId: row[0],
          text: row[1],
          createdAt: row[2],
          updatedAt: row[3],
          version: parseInt(row[4]) || 1
        });
      }
    });
    
    // Sort by version number (newest first)
    return versions.sort((a, b) => b.version - a.version);
  }
}
