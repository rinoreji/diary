# Copilot Instructions for the Diary Project

Welcome, Copilot! This guide will help you quickly understand and contribute to the Diary project.

## Project Overview
- **Type:** Angular 20 SPA
- **Purpose:** Diary app with Google authentication and Google Sheets cloud storage
- **UI:** Angular Material
- **Auth:** Firebase (Google Sign-In with Sheets/Drive scopes)
- **Storage:** Google Sheets API + Local Storage backup
- **Features:** Auto-save, unique entry management, offline support
- **Routing:** Protected home, login, fallback to home

## Key Files & Structure
- `src/main.ts` – App bootstrap
- `src/app/app.ts` – Root component
- `src/app/app.routes.ts` – Route definitions
- `src/app/auth-guard.ts` – Route guard for authentication
- `src/app/services/auth.service.ts` – Firebase Auth logic (Google OAuth with API scopes)
- `src/app/services/google-sheets.service.ts` – Google Sheets API integration
- `src/app/components/login/` – Login UI
- `src/app/components/home/` – Home UI with text editor and auto-save
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

## Development Notes
- Use Angular CLI for scaffolding components/services.
- Use Angular Material for UI consistency.
- All routes except `/login` are protected by `authGuard`.
- Auth is handled via `AuthService` using Firebase with Google Sheets/Drive scopes.
- Google Sheets integration via `GoogleSheetsService` handles cloud storage.
- Each diary entry gets a unique UUID for consistent updates.
- Auto-save functionality saves entries every 25 seconds (configurable).
- Local storage provides offline backup and faster loading.
- **Versioning System**: Every change creates a new version with timestamps.
- **Version History**: All previous versions are preserved and accessible.
- **Data Structure**: Entries include ID, text, createdAt, updatedAt, version, and isCurrent flag.
- Smart update logic prevents duplicate entries in Google Sheets.
- Deployment is automated to GitHub Pages via GitHub Actions.

## Versioning Features
- **Entry Versioning**: Each change creates a new version with incremental version numbers
- **Timestamp Tracking**: CreatedAt (first creation) and UpdatedAt (last modification) timestamps
- **Version History**: Access to all previous versions of an entry via `getEntryVersions()`
- **Current Version Flag**: Only the latest version is marked as current in the spreadsheet
- **Version Preservation**: Old versions are never deleted, providing full audit trail

## API Integration
- **Google Sheets API:** Used for storing diary entries in cloud
- **Google Drive API:** Used for managing the "Diary" spreadsheet
- **Firebase Auth:** Handles OAuth flow with proper API scopes

## Useful Commands
- `ng generate component <name>` – Create a new component
- `ng generate service <name>` – Create a new service
- `ng test` – Run unit tests
- `ng build` – Build the app

## Additional Info
- See `README.md` for more details on setup and usage.
- For Firebase config, check `src/environments/environment.ts`.
- For deployment, see `.github/workflows/deploy.yml`.
- Google Sheets integration requires proper OAuth scopes (sheets, drive).
- Auto-save interval can be modified in `home.ts` (currently 25 seconds).
- UUID package is used for generating unique entry identifiers.

## Dependencies
- `@angular/fire` - Firebase integration
- `uuid` - Unique identifier generation
- `@angular/material` - UI components
- Standard Angular 20 dependencies

---
Happy coding!
