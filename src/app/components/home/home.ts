import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DiaryEntry, Category, CategoryStats } from '../../interfaces/diary-entry.interface';
import { AppDataService } from '../../services/app-data.service';
import { GoogleSheetsStorageProvider } from '../../services/google-sheets-storage.service';
import { AuthService } from '../../services/auth.service';
import { DEFAULT_CATEGORIES, UNCATEGORIZED_CATEGORY } from '../../constants/categories.constants';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements OnInit, OnDestroy {
  userText: string = '';
  private accessToken: string | null = null;
  uniqueId: string | null = null;
  lastSavedText: string | null = null;
  currentVersion: number = 1;
  createdAt: string | null = null;
  private isSaving: boolean = false;
  private saveTimeout: any = null;
  private intervalId: any;
  
  // Entry management
  allEntries: DiaryEntry[] = [];
  selectedEntryId: string | null = null;
  isLoadingEntries: boolean = false;

  // Category management
  currentCategory: string = 'daily';
  currentTags: string[] = [];
  availableCategories: Category[] = DEFAULT_CATEGORIES;
  categoryStats: CategoryStats[] = [];
  selectedCategory: string = 'all';
  newTag: string = '';
  allTags: string[] = [];

  constructor(
    private appDataService: AppDataService,
    private googleSheetsStorage: GoogleSheetsStorageProvider,
    private authService: AuthService,
    private router: Router
  ) {
    // Set up the storage provider
    this.appDataService.setStorageProvider(this.googleSheetsStorage);
  }

  async ngOnInit() {
    console.log('Home component initialized');
    
    try {
      // Try to get a valid access token
      this.accessToken = await this.authService.getValidAccessToken();
      
      if (!this.accessToken) {
        console.log('No valid access token available, redirecting to login');
        this.router.navigate(['/login']);
        return;
      }

      // Initialize storage with valid token
      await this.appDataService.initialize(this.accessToken);
      
      // Load all entries (this will calculate local category stats)
      await this.loadAllEntries();
      
      // Load detailed category stats from server (for accuracy, runs in background)
      this.loadCategoryStats().catch(error => {
        console.warn('Failed to load detailed category stats from server:', error);
      });
      
      // If there's a uniqueId in localStorage, select that entry
      const storedId = localStorage.getItem('current_entry_id');
      if (storedId) {
        await this.selectEntry(storedId);
      } else {
        // Create a new entry if no stored ID
        this.createNewEntry();
      }

      // Set up auto-save and window event listeners
      this.setupAutoSave();
      this.addWindowEventListeners();
      
    } catch (error) {
      console.error('Error initializing home component:', error);
      
      // Redirect to login on any authentication error
      console.log('Authentication error, redirecting to login');
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.removeWindowEventListeners();
  }

  // Load all entries from storage
  async loadAllEntries(): Promise<void> {
    if (!this.accessToken) return;
    
    this.isLoadingEntries = true;
    try {
      this.allEntries = await this.appDataService.getAllEntries(this.accessToken);
      
      // Calculate local category stats after loading entries
      this.calculateLocalCategoryStats();
      
      console.log('Loaded entries:', this.allEntries.length);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      this.isLoadingEntries = false;
    }
  }

  // Select an entry for editing
  async selectEntry(entryId: string): Promise<void> {
    if (!this.accessToken) return;

    try {
      // Save current entry before switching
      if (this.uniqueId && this.userText !== this.lastSavedText) {
        await this.saveEntry();
      }

      const entry = await this.appDataService.getEntry(this.accessToken, entryId);
      if (entry) {
        this.uniqueId = entry.uniqueId;
        this.userText = entry.text;
        this.lastSavedText = entry.text;
        this.currentVersion = entry.version;
        this.createdAt = entry.createdAt;
        this.selectedEntryId = entryId;
        
        // Load category and tags
        this.currentCategory = entry.category || 'uncategorized';
        this.currentTags = entry.tags ? [...entry.tags] : [];

        // Store in localStorage
        localStorage.setItem('current_entry_id', entryId);
        localStorage.setItem('diary_text', this.userText);

        console.log('Selected entry:', entryId, 'version:', this.currentVersion, 'category:', this.currentCategory);
      }
    } catch (error) {
      console.error('Error selecting entry:', error);
    }
  }

  // Create a new entry
  createNewEntry(): void {
    this.uniqueId = uuidv4();
    this.userText = '';
    this.lastSavedText = '';
    this.currentVersion = 1;
    this.createdAt = new Date().toISOString();
    this.selectedEntryId = null;
    
    // Reset category and tags to defaults
    this.currentCategory = 'daily';
    this.currentTags = [];

    // Store in localStorage
    localStorage.setItem('current_entry_id', this.uniqueId);
    localStorage.setItem('diary_text', '');

    console.log('Created new entry:', this.uniqueId, 'category:', this.currentCategory);
  }

  // Save current entry
  async saveEntry(): Promise<void> {
    if (!this.accessToken || !this.uniqueId || this.isSaving) {
      return;
    }

    // Don't save if nothing has changed
    if (this.userText === this.lastSavedText) {
      console.log('No changes to save');
      return;
    }

    this.isSaving = true;
    console.log('Saving entry:', this.uniqueId, 'version:', this.currentVersion);

    try {
      const entry: DiaryEntry = {
        uniqueId: this.uniqueId,
        text: this.userText,
        category: this.currentCategory,
        tags: [...this.currentTags],
        createdAt: this.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: this.currentVersion
      };

      await this.appDataService.saveEntry(this.accessToken, entry, this.lastSavedText || '');

      // Update local state
      this.lastSavedText = this.userText;
      this.currentVersion++;

      // Update localStorage
      localStorage.setItem('diary_text', this.userText);

      // Update category stats locally for immediate UI feedback
      this.updateLocalCategoryStats(entry);

      // Refresh entries list
      await this.loadAllEntries();

      console.log('Entry saved successfully, new version:', this.currentVersion);
    } catch (error) {
      console.error('Error saving entry:', error);
    } finally {
      this.isSaving = false;
    }
  }

  // Manual save trigger (public method for template)
  async manualSave(): Promise<void> {
    await this.saveEntry();
  }

  // Debounced save
  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(async () => {
      await this.saveEntry();
    }, 500); // 500ms debounce
  }

  // Set up auto-save mechanisms
  private setupAutoSave(): void {
    // Save every 30 seconds
    this.intervalId = setInterval(async () => {
      if (this.userText !== this.lastSavedText) {
        await this.saveEntry();
      }
    }, 30000);
  }

  // Handle text area blur (save on focus loss)
  onTextareaBlur(): void {
    this.debouncedSave();
  }

  // Handle text changes
  onTextChange(): void {
    // Save to localStorage immediately for crash recovery
    if (this.uniqueId) {
      localStorage.setItem('diary_text', this.userText);
    }
  }

  // Window event listeners for auto-save
  private addWindowEventListeners(): void {
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.addEventListener('blur', this.handleWindowBlur.bind(this));
    window.addEventListener('focus', this.handleWindowFocus.bind(this));
  }

  private removeWindowEventListeners(): void {
    window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.removeEventListener('blur', this.handleWindowBlur.bind(this));
    window.removeEventListener('focus', this.handleWindowFocus.bind(this));
  }

  private handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.userText !== this.lastSavedText) {
      // Save immediately before unload
      this.saveEntry();
      event.preventDefault();
      event.returnValue = '';
    }
  }

  private handleWindowBlur(): void {
    this.debouncedSave();
  }

  private handleWindowFocus(): void {
    // Reload entries when window regains focus
    this.loadAllEntries();
  }

  // Get preview text for entry list
  getEntryPreview(text: string): string {
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  }

  // Format date for display
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  // Check if entry is currently selected
  isEntrySelected(entryId: string): boolean {
    return this.selectedEntryId === entryId;
  }

  // Get storage statistics
  async getStorageStats(): Promise<any> {
    if (!this.accessToken) return null;
    
    try {
      return await this.appDataService.getAppStats(this.accessToken);
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return null;
    }
  }

  // Preview category change impact (called when dropdown changes)
  onCategorySelectionChange(): void {
    // This is called when user changes category dropdown for current entry
    // We can show preview or auto-save if needed
    console.log('Category changed to:', this.currentCategory);
    
    // Trigger debounced save to apply category change
    this.debouncedSave();
  }

  // Clear all data (for testing)
  async clearAllData(): Promise<void> {
    if (!this.accessToken) return;
    
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      try {
        if (this.googleSheetsStorage.clearAllData) {
          await this.googleSheetsStorage.clearAllData(this.accessToken);
          
          // Reset local state
          this.userText = '';
          this.lastSavedText = '';
          this.allEntries = [];
          this.selectedEntryId = null;
          this.createNewEntry();
          
          console.log('All data cleared');
        }
      } catch (error) {
        console.error('Error clearing data:', error);
      }
    }
  }

  // Category management methods
  onCategoryChange(): void {
    this.loadFilteredEntries();
  }

  filterByCategory(category: string): void {
    this.selectedCategory = category;
    this.loadFilteredEntries();
    console.log('Filtered by category:', category);
  }

  async loadFilteredEntries(): Promise<void> {
    if (!this.accessToken) return;

    try {
      if (this.selectedCategory === 'all') {
        this.allEntries = await this.appDataService.getAllEntries(this.accessToken);
      } else {
        this.allEntries = await this.appDataService.getEntriesByCategory(this.accessToken, this.selectedCategory);
      }
    } catch (error) {
      console.error('Error loading filtered entries:', error);
    }
  }

  async loadCategoryStats(): Promise<void> {
    if (!this.accessToken) return;

    try {
      this.categoryStats = await this.appDataService.getCategoryStats(this.accessToken);
      this.allTags = await this.appDataService.getAllTags(this.accessToken);
    } catch (error) {
      console.error('Error loading category stats:', error);
    }
  }

  addTag(): void {
    if (this.newTag.trim() && !this.currentTags.includes(this.newTag.trim())) {
      this.currentTags.push(this.newTag.trim());
      this.newTag = '';
    }
  }

  removeTag(tag: string): void {
    this.currentTags = this.currentTags.filter(t => t !== tag);
  }

  getCategoryIcon(categoryId: string): string {
    const category = this.availableCategories.find(cat => cat.id === categoryId);
    return category?.icon || 'folder';
  }

  getCategoryName(categoryId: string): string {
    const category = this.availableCategories.find(cat => cat.id === categoryId);
    return category?.name || categoryId;
  }

  getCategoryColor(categoryId: string): string {
    const category = this.availableCategories.find(cat => cat.id === categoryId);
    return category?.color || '#9E9E9E';
  }

  getTotalEntriesCount(): number {
    return this.allEntries.length;
  }

  getFilteredEntries(): DiaryEntry[] {
    if (this.selectedCategory === 'all') {
      return this.allEntries;
    }
    return this.allEntries.filter(entry => entry.category === this.selectedCategory);
  }

  /**
   * Update category stats locally for immediate UI feedback
   */
  updateLocalCategoryStats(savedEntry: DiaryEntry): void {
    // Find existing entry in allEntries to check if category changed
    const existingEntryIndex = this.allEntries.findIndex(e => e.uniqueId === savedEntry.uniqueId);
    const isNewEntry = existingEntryIndex === -1;
    const oldCategory = isNewEntry ? null : this.allEntries[existingEntryIndex].category;

    // Update or add entry in allEntries
    if (isNewEntry) {
      this.allEntries.push(savedEntry);
    } else {
      this.allEntries[existingEntryIndex] = savedEntry;
    }

    // Update category stats
    if (isNewEntry) {
      // New entry: increment count for new category
      this.incrementCategoryCount(savedEntry.category);
    } else if (oldCategory !== savedEntry.category) {
      // Category changed: decrement old, increment new
      if (oldCategory) {
        this.decrementCategoryCount(oldCategory);
      }
      this.incrementCategoryCount(savedEntry.category);
    }

    // Update last activity for the category
    this.updateCategoryLastActivity(savedEntry.category, savedEntry.updatedAt);

    console.log('Updated local category stats for:', savedEntry.category);
  }

  private incrementCategoryCount(category: string): void {
    let stat = this.categoryStats.find(s => s.category === category);
    if (!stat) {
      stat = {
        category,
        entryCount: 0,
        totalVersions: 0,
        storageSize: 0,
        lastActivity: ''
      };
      this.categoryStats.push(stat);
    }
    stat.entryCount++;
  }

  private decrementCategoryCount(category: string): void {
    const stat = this.categoryStats.find(s => s.category === category);
    if (stat && stat.entryCount > 0) {
      stat.entryCount--;
      // Remove stat if no entries left
      if (stat.entryCount === 0) {
        this.categoryStats = this.categoryStats.filter(s => s.category !== category);
      }
    }
  }

  private updateCategoryLastActivity(category: string, timestamp: string): void {
    const stat = this.categoryStats.find(s => s.category === category);
    if (stat) {
      if (!stat.lastActivity || timestamp > stat.lastActivity) {
        stat.lastActivity = timestamp;
      }
    }
  }

  /**
   * Calculate category stats from current allEntries (client-side)
   */
  calculateLocalCategoryStats(): void {
    const categoryMap = new Map<string, CategoryStats>();

    // Reset stats
    this.categoryStats = [];

    // Count entries by category
    for (const entry of this.allEntries) {
      const category = entry.category || 'uncategorized';
      let stats = categoryMap.get(category);
      
      if (!stats) {
        stats = {
          category,
          entryCount: 0,
          totalVersions: 0,
          storageSize: 0,
          lastActivity: ''
        };
        categoryMap.set(category, stats);
      }

      stats.entryCount++;
      
      // Update last activity
      if (!stats.lastActivity || entry.updatedAt > stats.lastActivity) {
        stats.lastActivity = entry.updatedAt;
      }
    }

    this.categoryStats = Array.from(categoryMap.values());
    console.log('Calculated local category stats:', this.categoryStats);
  }
}