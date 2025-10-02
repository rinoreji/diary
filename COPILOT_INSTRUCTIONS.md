# Copilot Instructions for the Diary Project

Welcome, Copilot! This guide will help you quickly understand and contribute to the Diary project.

## Project Overview
- **Type:** Angular 20 SPA
- **Purpose:** Multi-entry diary app with Google authentication and efficient cloud storage
- **UI:** Angular Material
- **Auth:** Firebase (Google Sign-In with Sheets/Drive scopes)
- **Storage:** Google Sheets API with delta compression + Local Storage backup
- **Features:** Auto-save, delta compression versioning (60-90% space savings), multi-entry management, search, statistics
- **Architecture:** Modular design with swappable storage providers
- **Routing:** Protected home, login, fallback to home

## Key Files & Structure
- `src/main.ts` – App bootstrap
- `src/app/app.ts` – Root component
- `src/app/app.routes.ts` – Route definitions
- `src/app/auth-guard.ts` – Route guard for authentication
- `src/app/services/auth.service.ts` – Firebase Auth logic (Google OAuth with API scopes)
- `src/app/services/app-data.service.ts` – **Main application service** (entry management, search, stats)
- `src/app/services/version-manager.service.ts` – **Delta compression and versioning**
- `src/app/services/storage/` – **Storage provider architecture**
  - `storage-provider.interface.ts` – Abstract storage contract
  - `google-sheets-storage.provider.ts` – Google Sheets implementation
- `src/app/interfaces/` – TypeScript interfaces (DiaryEntry, etc.)
- `src/app/components/login/` – Login UI
- `src/app/components/home/` – **Main UI** with multi-entry management, sidebar, search
- `src/app/components/header/` – Header with user info
- `src/app/components/footer/` – Footer component
- `src/environments/environment.ts` – Firebase config

## How to Start
1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Run locally:**
   ```bash
   npm start
   # or
   ng serve
   ```
3. **Run tests:**
   ```bash
   npm test
   ```
4. **Build for production:**
   ```bash
   npm run build
   ```

## Architecture Overview
The app uses a **modular storage provider pattern**:
- `AppDataService` – High-level application logic (entry management, search, statistics)
- `VersionManagerService` – Delta compression and version management
- `StorageProvider` interface – Abstract storage contract
- `GoogleSheetsStorageProvider` – Current Google Sheets implementation

This architecture makes it easy to swap storage backends (add Notion, Firebase, etc.) without changing core logic.

## Development Notes
- Use Angular CLI for scaffolding components/services.
- Use Angular Material for UI consistency.
- All routes except `/login` are protected by `authGuard`.
- Auth is handled via `AuthService` using Firebase with Google Sheets/Drive scopes.
- **Delta Compression**: Achieves 60-90% space savings by storing only changes
- **Baseline Strategy**: Full snapshots every 10 versions for faster reconstruction
- **Multi-Entry Management**: Sidebar with entry list, search, and statistics
- Auto-save functionality saves entries every 25 seconds (configurable).
- Local storage provides offline backup and faster loading.
- Smart update logic prevents duplicate entries in Google Sheets.
- Deployment is automated to GitHub Pages via GitHub Actions.

## Core Features
- **Delta Compression Versioning**: Efficient storage using change-based versioning
- **Multi-Entry Support**: Create, edit, and manage multiple diary entries
- **Smart Search**: Real-time search across all entries with highlighting
- **Entry Statistics**: Word count, character count, version history analytics
- **Modular Architecture**: Easy to extend with new storage providers
- **Auto-save & Offline**: Automatic saving with local storage backup

## API Integration
- **Google Sheets API:** Used for storing diary entries and versions in cloud
- **Google Drive API:** Used for managing the "Diary" spreadsheet
- **Firebase Auth:** Handles OAuth flow with proper API scopes

## Storage Architecture
- **Entries Sheet**: Stores current entries with metadata
- **Versions Sheet**: Stores delta-compressed version history
- **Local Storage**: Backup and offline support
- **Delta Compression**: Uses `diff` library for change detection and storage efficiency

## Useful Commands
- `ng generate component <name>` – Create a new component
- `ng generate service <name>` – Create a new service
- `ng test` – Run unit tests
- `ng build` – Build the app

## Key Dependencies
- `@angular/fire` - Firebase integration
- `uuid` - Unique identifier generation
- `diff` - Delta compression for versioning
- Modern Angular HTTP client with `firstValueFrom()`

## Additional Info
- See `README.md` for comprehensive setup and usage documentation.
- For Firebase config, check `src/environments/environment.ts`.
- For deployment, see `.github/workflows/deploy.yml`.
- Google Sheets integration requires proper OAuth scopes (sheets, drive).
- Auto-save interval can be modified in `home.ts` (currently 25 seconds).
- Delta compression provides significant storage savings while maintaining full version history.
- The modular architecture makes it easy to add new storage providers like Notion or Firebase.
- `@angular/material` - UI components
- Standard Angular 20 dependencies

---
Happy coding!
