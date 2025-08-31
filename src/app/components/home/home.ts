import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { GoogleSheetsService } from '../../services/google-sheets.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, HttpClientModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit, OnDestroy {
  userText: string = '';
  private intervalId: any;
  private accessToken: string | null = null;
  private lastSavedText: string | null = null; // Track the last saved text

  constructor(
    private googleSheetsService: GoogleSheetsService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    // Load text from localStorage on initialization
    const savedText = localStorage.getItem('userText');
    if (savedText) {
      this.userText = savedText;
    }

    // Ensure the 'Diary' spreadsheet exists
    try {
      this.accessToken = await this.authService.loginWithGoogle();
      if (this.accessToken) {
        await this.googleSheetsService.ensureDiarySpreadsheet(this.accessToken);
      } else {
        console.error('Access token is undefined.');
      }
    } catch (error) {
      console.error('Error ensuring Diary spreadsheet:', error);
    }

    // Periodically save text to Google Sheets
    this.intervalId = setInterval(async () => {
      if (this.userText && this.userText !== this.lastSavedText) { // Check if text has changed
        try {
          if (!this.accessToken) {
            this.accessToken = await this.authService.loginWithGoogle();
          }
          if (this.accessToken) {
            this.googleSheetsService.saveTextToSheet(this.accessToken, this.userText);
            this.lastSavedText = this.userText; // Update the last saved text
          } else {
            console.error('Access token is undefined.');
          }
        } catch (error) {
          console.error('Error getting access token:', error);
        }
      }
    }, 10000); // Save every 10 seconds
  }

  ngOnDestroy() {
    // Clear the interval when the component is destroyed
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  ngOnChanges() {
    // Save text to localStorage whenever it changes
    localStorage.setItem('userText', this.userText);
  }
}
