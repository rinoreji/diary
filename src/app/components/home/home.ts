import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { GoogleSheetsService } from '../../services/google-sheets.service';
import { AuthService } from '../../services/auth.service';
import { v4 as uuidv4 } from 'uuid'; // Import UUID library

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
  private uniqueId: string | null = null; // Track the unique ID for the row

  constructor(
    private googleSheetsService: GoogleSheetsService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    // Load text and unique ID from localStorage on initialization
    const savedText = localStorage.getItem('userText');
    const savedId = localStorage.getItem('uniqueId');
    if (savedText) {
      this.userText = savedText;
    }
    if (savedId) {
      this.uniqueId = savedId;
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

    // Periodically save or update text in Google Sheets
    this.intervalId = setInterval(async () => {
      if (this.userText) {
        try {
          if (!this.accessToken) {
            this.accessToken = await this.authService.loginWithGoogle();
          }
          if (this.accessToken) {
            if (!this.uniqueId) {
              // Generate a new unique ID and append a new row
              this.uniqueId = uuidv4();
              localStorage.setItem('uniqueId', this.uniqueId || ''); // Ensure uniqueId is a string
              this.googleSheetsService.appendRow(this.accessToken, this.uniqueId, this.userText);
            } else {
              // Update the existing row
              this.googleSheetsService.updateRow(this.accessToken, this.uniqueId, this.userText);
            }
            localStorage.setItem('userText', this.userText); // Update localStorage
          } else {
            console.error('Access token is undefined.');
          }
        } catch (error) {
          console.error('Error getting access token:', error);
        }
      }
    }, 25000); // Save every 25 seconds
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
