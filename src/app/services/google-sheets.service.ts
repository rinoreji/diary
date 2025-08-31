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

  // Append a new row to the 'Diary' spreadsheet
  appendRow(accessToken: string, uniqueId: string, text: string): void {
    if (!this.spreadsheetId) {
      console.error('Spreadsheet ID is not set. Ensure the Diary spreadsheet exists first.');
      return;
    }

    const url = `${this.SHEETS_API_URL}/${this.spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`;
    const body = {
      values: [[uniqueId, text]]
    };
    const headers = {
      Authorization: `Bearer ${accessToken}`
    };

    this.http.post(url, body, { headers }).subscribe({
      next: (response) => console.log('Row appended successfully:', response),
      error: (err) => console.error('Error appending row to Google Sheets:', err)
    });
  }

  // Update an existing row in the 'Diary' spreadsheet
  updateRow(accessToken: string, uniqueId: string, text: string): void {
    if (!this.spreadsheetId) {
      console.error('Spreadsheet ID is not set. Ensure the Diary spreadsheet exists first.');
      return;
    }

    const url = `${this.SHEETS_API_URL}/${this.spreadsheetId}/values:batchUpdate`;
    const body = {
      data: [
        {
          range: `A1:B1`, // Adjust range to locate the row with the unique ID
          values: [[uniqueId, text]]
        }
      ],
      valueInputOption: 'USER_ENTERED'
    };
    const headers = {
      Authorization: `Bearer ${accessToken}`
    };

    this.http.post(url, body, { headers }).subscribe({
      next: (response) => console.log('Row updated successfully:', response),
      error: (err) => console.error('Error updating row in Google Sheets:', err)
    });
  }
}
