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
  private isSaving: boolean = false; // Prevent concurrent saves
  private saveTimeout: any = null; // Debounce save calls
  
  // Entry management
  allEntries: DiaryEntry[] = []; // All diary entries
  selectedEntryId: string | null = null; // Currently selected entry
  isLoadingEntries: boolean = false;

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
      this.selectedEntryId = savedId;
    }
    if (savedCreatedAt) {
      this.createdAt = savedCreatedAt;
    }
    if (savedVersion) {
      this.currentVersion = parseInt(savedVersion) || 1;
    }

    // Ensure the 'Diary' spreadsheet exists and load entries
    try {
      this.accessToken = await this.authService.getValidAccessToken();
      if (this.accessToken) {
        await this.googleSheetsService.ensureDiarySpreadsheet(this.accessToken);
        
        // Load all entries
        await this.loadAllEntries();
        
        // If we have a unique ID, select that entry, otherwise create new
        if (this.uniqueId) {
          this.selectEntry(this.uniqueId);
        } else {
          // If no saved entry, start with a new entry
          this.createNewEntry();
        }
      } else {
        console.error('Failed to get valid access token.');
      }
    } catch (error) {
      console.error('Error ensuring Diary spreadsheet:', error);
    }

    // Periodically save or update text in Google Sheets
    this.intervalId = setInterval(async () => {
      if (this.userText && this.userText !== this.lastSavedText && !this.isSaving) {
        try {
          if (!this.accessToken) {
            this.accessToken = await this.authService.getValidAccessToken();
          }
          if (this.accessToken) {
            await this.saveOrUpdateEntry();
          } else {
            console.error('Failed to get valid access token.');
          }
        } catch (error) {
          console.error('Error getting access token:', error);
        }
      }
    }, 25000); // Save every 25 seconds

    // Add event listeners for window focus changes
    this.addWindowEventListeners();
  }

  private async saveOrUpdateEntry(): Promise<void> {
    if (!this.accessToken) {
      console.error('No access token available');
      return;
    }

    // Prevent concurrent saves
    if (this.isSaving) {
      console.log('Save already in progress, skipping...');
      return;
    }

    this.isSaving = true;

    try {
      const now = new Date().toISOString();
      
      if (!this.uniqueId) {
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
        
        localStorage.setItem('uniqueId', this.uniqueId);
        localStorage.setItem('createdAt', this.createdAt);
        localStorage.setItem('currentVersion', this.currentVersion.toString());
        
        this.googleSheetsService.appendRow(this.accessToken, newEntry);
        console.log(`New entry created - Version: ${this.currentVersion}`);
      } else {
        // Update existing entry with new version
        this.currentVersion++;
        
        const updatedEntry: DiaryEntry = {
          uniqueId: this.uniqueId,
          text: this.userText,
          createdAt: this.createdAt || now,
          updatedAt: now,
          version: this.currentVersion
        };
        
        localStorage.setItem('currentVersion', this.currentVersion.toString());
        
        await this.googleSheetsService.updateRow(this.accessToken, updatedEntry);
        console.log(`Entry updated - Version: ${this.currentVersion}`);
      }
      
      this.lastSavedText = this.userText;
      localStorage.setItem('userText', this.userText);
      
      // Refresh entries list after saving
      await this.loadAllEntries();
    } finally {
      this.isSaving = false;
    }
  }

  // Debounced save method to prevent duplicate saves
  private debouncedSave(reason: string): void {
    console.log(`Save triggered by: ${reason}`);
    
    // Clear any existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // Set a new timeout
    this.saveTimeout = setTimeout(async () => {
      if (this.userText && this.userText !== this.lastSavedText && !this.isSaving) {
        try {
          if (!this.accessToken) {
            this.accessToken = await this.authService.getValidAccessToken();
          }
          if (this.accessToken) {
            await this.saveOrUpdateEntry();
          } else {
            console.error('Failed to get valid access token');
          }
        } catch (error) {
          console.error(`Error saving (${reason}):`, error);
        }
      }
    }, 500); // 500ms debounce delay
  }

  ngOnDestroy() {
    // Clear the interval when the component is destroyed
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    // Clear any pending save timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // Remove window event listeners
    this.removeWindowEventListeners();
  }

  // Add window event listeners for save on focus change
  private addWindowEventListeners(): void {
    // Save when window loses focus (user switches to another app/tab)
    window.addEventListener('blur', this.onWindowBlur.bind(this));
    
    // Save when page is about to be unloaded (user closes tab/navigates away)
    window.addEventListener('beforeunload', this.onBeforeUnload.bind(this));
  }

  // Remove window event listeners
  private removeWindowEventListeners(): void {
    window.removeEventListener('blur', this.onWindowBlur.bind(this));
    window.removeEventListener('beforeunload', this.onBeforeUnload.bind(this));
  }

  // Save when window loses focus
  private async onWindowBlur(): Promise<void> {
    this.debouncedSave('window blur');
  }

  // Save when page is about to be unloaded
  private onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.userText && this.userText !== this.lastSavedText) {
      // Try to save synchronously (limited time available)
      console.log('Page unloading, attempting quick save...');
      
      // Update localStorage immediately
      localStorage.setItem('userText', this.userText);
      
      // Show browser warning for unsaved changes
      event.preventDefault();
      event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return event.returnValue;
    }
    return undefined;
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
    
    // Cancel any debounced save and save immediately
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
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

  // Save when textarea loses focus
  public async onTextareaBlur(): Promise<void> {
    this.debouncedSave('textarea blur');
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

  // Load all entries from Google Sheets
  async loadAllEntries(): Promise<void> {
    if (!this.accessToken) return;
    
    this.isLoadingEntries = true;
    try {
      this.allEntries = await this.googleSheetsService.getAllCurrentEntries(this.accessToken);
      console.log('Loaded entries:', this.allEntries.length);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      this.isLoadingEntries = false;
    }
  }

  // Select an entry to edit
  selectEntry(entryId: string): void {
    const entry = this.allEntries.find(e => e.uniqueId === entryId);
    if (entry) {
      // Save current entry if there are unsaved changes
      if (this.userText && this.userText !== this.lastSavedText) {
        this.debouncedSave('switching entries');
      }
      
      // Switch to selected entry
      this.uniqueId = entry.uniqueId;
      this.selectedEntryId = entry.uniqueId;
      this.userText = entry.text;
      this.lastSavedText = entry.text;
      this.currentVersion = entry.version;
      this.createdAt = entry.createdAt;
      
      // Update localStorage
      localStorage.setItem('uniqueId', this.uniqueId);
      localStorage.setItem('userText', this.userText);
      localStorage.setItem('createdAt', this.createdAt);
      localStorage.setItem('currentVersion', this.currentVersion.toString());
      
      console.log('Switched to entry:', entry.uniqueId);
    }
  }

  // Create a new entry
  createNewEntry(): void {
    // Save current entry if there are unsaved changes
    if (this.userText && this.userText !== this.lastSavedText) {
      this.debouncedSave('creating new entry');
    }
    
    // Reset to new entry state
    this.uniqueId = null;
    this.selectedEntryId = null;
    this.userText = '';
    this.lastSavedText = '';
    this.currentVersion = 1;
    this.createdAt = null;
    
    // Clear localStorage for current entry
    localStorage.removeItem('uniqueId');
    localStorage.removeItem('userText');
    localStorage.removeItem('createdAt');
    localStorage.removeItem('currentVersion');
    
    console.log('Created new entry');
  }

  // Get entry preview text (first 50 characters)
  getEntryPreview(entry: DiaryEntry): string {
    return entry.text.length > 50 ? entry.text.substring(0, 50) + '...' : entry.text;
  }

  // Get formatted date for display
  getFormattedDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  }
}
