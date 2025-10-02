import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { GoogleSheetsService, DiaryEntry } from '../../services/google-sheets.service';
import { AuthService } from '../../services/auth.service';
import { v4 as uuidv4 } from 'uuid'; // Import UUID library

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, HttpClientModule, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit, OnDestroy {
  userText: string = '';
  private intervalId: any;
  private accessToken: string | null = null;
  uniqueId: string | null = null; // Track the unique ID for the row (public for template)
  lastSavedText: string | null = null; // Track the last saved text (public for template)
  currentVersion: number = 1; // Track current version number (public for template)
  createdAt: string | null = null; // Track creation time (public for template)

  constructor(
    private googleSheetsService: GoogleSheetsService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    // Load text and unique ID from localStorage on initialization
    const savedText = localStorage.getItem('userText');
    const savedId = localStorage.getItem('uniqueId');
    const savedCreatedAt = localStorage.getItem('createdAt');
    const savedVersion = localStorage.getItem('currentVersion');
    
    if (savedText) {
      this.userText = savedText;
      this.lastSavedText = savedText;
    }
    if (savedId) {
      this.uniqueId = savedId;
    }
    if (savedCreatedAt) {
      this.createdAt = savedCreatedAt;
    }
    if (savedVersion) {
      this.currentVersion = parseInt(savedVersion) || 1;
    }

    // Ensure the 'Diary' spreadsheet exists
    try {
      this.accessToken = await this.authService.getValidAccessToken();
      if (this.accessToken) {
        await this.googleSheetsService.ensureDiarySpreadsheet(this.accessToken);
        
        // If we have a unique ID, load the current entry from Google Sheets
        if (this.uniqueId) {
          const currentEntry = await this.googleSheetsService.getCurrentEntry(this.accessToken, this.uniqueId);
          if (currentEntry) {
            this.userText = currentEntry.text;
            this.lastSavedText = currentEntry.text;
            this.currentVersion = currentEntry.version;
            this.createdAt = currentEntry.createdAt;
            localStorage.setItem('userText', this.userText);
          }
        }
      } else {
        console.error('Failed to get valid access token.');
      }
    } catch (error) {
      console.error('Error ensuring Diary spreadsheet:', error);
    }

    // Periodically save or update text in Google Sheets
    this.intervalId = setInterval(async () => {
      console.log('Auto-save interval triggered');
      console.log('Conditions:', {
        hasText: !!this.userText,
        textChanged: this.userText !== this.lastSavedText,
        userText: this.userText.substring(0, 30) + '...',
        lastSavedText: this.lastSavedText?.substring(0, 30) + '...'
      });
      
      if (this.userText && this.userText !== this.lastSavedText) {
        console.log('Text changed, attempting to save...');
        try {
          if (!this.accessToken) {
            console.log('Getting valid access token...');
            this.accessToken = await this.authService.getValidAccessToken();
          }
          if (this.accessToken) {
            console.log('Calling saveOrUpdateEntry...');
            await this.saveOrUpdateEntry();
          } else {
            console.error('Failed to get valid access token.');
          }
        } catch (error) {
          console.error('Error getting access token:', error);
        }
      } else {
        console.log('No changes detected, skipping save');
      }
    }, 25000); // Save every 25 seconds
  }

  private async saveOrUpdateEntry(): Promise<void> {
    console.log('saveOrUpdateEntry called');
    console.log('Current state:', {
      hasAccessToken: !!this.accessToken,
      uniqueId: this.uniqueId,
      userText: this.userText.substring(0, 50) + '...',
      lastSavedText: this.lastSavedText?.substring(0, 50) + '...',
      currentVersion: this.currentVersion
    });

    if (!this.accessToken) {
      console.error('No access token available');
      return;
    }

    const now = new Date().toISOString();
    
    if (!this.uniqueId) {
      console.log('Creating new entry...');
      // Create new entry
      this.uniqueId = uuidv4();
      this.createdAt = now;
      this.currentVersion = 1;
      
      const newEntry: DiaryEntry = {
        uniqueId: this.uniqueId,
        text: this.userText,
        createdAt: this.createdAt,
        updatedAt: now,
        version: this.currentVersion
      };
      
      console.log('New entry to save:', newEntry);
      
      localStorage.setItem('uniqueId', this.uniqueId);
      localStorage.setItem('createdAt', this.createdAt);
      localStorage.setItem('currentVersion', this.currentVersion.toString());
      
      this.googleSheetsService.appendRow(this.accessToken, newEntry);
    } else {
      console.log('Updating existing entry...');
      // Update existing entry with new version
      this.currentVersion++;
      
      const updatedEntry: DiaryEntry = {
        uniqueId: this.uniqueId,
        text: this.userText,
        createdAt: this.createdAt || now,
        updatedAt: now,
        version: this.currentVersion
      };
      
      console.log('Updated entry to save:', updatedEntry);
      
      localStorage.setItem('currentVersion', this.currentVersion.toString());
      
      await this.googleSheetsService.updateRow(this.accessToken, updatedEntry);
    }
    
    this.lastSavedText = this.userText;
    localStorage.setItem('userText', this.userText);
    console.log(`Entry saved/updated - Version: ${this.currentVersion}, Updated: ${now}`);
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

  // Method to view version history (for testing/debugging)
  public async viewVersionHistory(): Promise<void> {
    if (!this.accessToken || !this.uniqueId) {
      console.log('No access token or unique ID available');
      return;
    }

    try {
      const versions = await this.googleSheetsService.getEntryVersions(this.accessToken, this.uniqueId);
      console.log('Version History for Entry:', this.uniqueId);
      console.log('Total Versions:', versions.length);
      
      versions.forEach((version, index) => {
        console.log(`Version ${version.version}:`, {
          text: version.text.substring(0, 50) + (version.text.length > 50 ? '...' : ''),
          createdAt: version.createdAt,
          updatedAt: version.updatedAt,
          isLatest: index === 0
        });
      });
    } catch (error) {
      console.error('Error fetching version history:', error);
    }
  }

  // Manual save method for testing
  public async manualSave(): Promise<void> {
    console.log('Manual save triggered');
    try {
      this.accessToken = await this.authService.getValidAccessToken();
      if (this.accessToken) {
        await this.saveOrUpdateEntry();
      } else {
        console.error('Failed to get valid access token');
      }
    } catch (error) {
      console.error('Error in manual save:', error);
    }
  }

  // Test API connectivity
  public async testAPI(): Promise<void> {
    console.log('Testing API connectivity...');
    try {
      this.accessToken = await this.authService.getValidAccessToken();
      if (this.accessToken) {
        const isConnected = await this.googleSheetsService.testAPIConnectivity(this.accessToken);
        console.log('API connectivity test result:', isConnected ? 'Success' : 'Failed');
      } else {
        console.error('Failed to get valid access token for API test');
      }
    } catch (error) {
      console.error('Error in API test:', error);
    }
  }
}
