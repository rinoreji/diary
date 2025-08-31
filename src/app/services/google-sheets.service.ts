import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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
    const headers = { Authorization: `Bearer ${accessToken}` };
    const params = {
      q: "name='Diary' and mimeType='application/vnd.google-apps.spreadsheet'",
      fields: 'files(id, name)'
    };

    const response: any = await this.http.get(this.DRIVE_API_URL, { headers, params }).toPromise();
    if (response.files && response.files.length > 0) {
      this.spreadsheetId = response.files[0].id;
      console.log('Spreadsheet found:', this.spreadsheetId);
    } else {
      await this.createDiarySpreadsheet(accessToken);
    }
  }

  // Create the 'Diary' spreadsheet
  private async createDiarySpreadsheet(accessToken: string): Promise<void> {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const body = {
      properties: { title: 'Diary' }
    };

    const response: any = await this.http.post(this.SHEETS_API_URL, body, { headers }).toPromise();
    this.spreadsheetId = response.spreadsheetId;
    console.log('Spreadsheet created:', this.spreadsheetId);
  }

  // Save text to the 'Diary' spreadsheet
  saveTextToSheet(accessToken: string, text: string): void {
    console.log('saveTextToSheet called with text:', text); // Added log

    if (!this.spreadsheetId) {
      console.error('Spreadsheet ID is not set. Ensure the Diary spreadsheet exists first.');
      return;
    }

    const url = `${this.SHEETS_API_URL}/${this.spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`;
    const body = {
      values: [[text]]
    };
    const headers = {
      Authorization: `Bearer ${accessToken}`
    };

    this.http.post(url, body, { headers }).subscribe({
      next: (response) => console.log('Text saved successfully:', response),
      error: (err) => console.error('Error saving text to Google Sheets:', err)
    });
  }
}
