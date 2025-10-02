

# Diary


A modern diary web application built with Angular 20, Angular Material, and Firebase authentication (Google Sign-In) with Google Sheets integration for cloud storage. Features auto-save functionality and offline support.

---

## Features
- **Google Authentication** (Firebase with Google Sheets & Drive scopes)
- **Google Sheets Integration** (Cloud storage for diary entries)
- **Auto-save Functionality** (Automatically saves entries every 25 seconds)
- **Local Storage Backup** (Offline support with sync to cloud)
- **Unique Entry Management** (UUID-based entry tracking)
- **Smart Update Logic** (Only saves when content changes)
- **Entry Versioning** (Full version history with timestamps)
- **Created/Updated Timestamps** (Tracks when entries are created and modified)
- **Version History Tracking** (View all previous versions of an entry)
- **Protected Home Route** (auth guard)
- **Angular Material UI**
- **Responsive Design**
- **GitHub Pages Deployment**
- **Unit Testing with Jasmine/Karma**

---

## Getting Started

### Prerequisites
- Node.js (v22 recommended)
- npm

### Installation
```bash
npm install
```

### Development Server
```bash
npm start
# or
ng serve
```
Visit [http://localhost:4200/](http://localhost:4200/) in your browser.

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```
Build artifacts will be stored in the `dist/` directory.

### Deployment
Deployment is automated via GitHub Actions to GitHub Pages. See `.github/workflows/deploy.yml` for details.

---

## Project Structure
```
├── src/
│   ├── app/
│   │   ├── app.ts           # Root component
│   │   ├── app.routes.ts    # Route definitions
│   │   ├── auth-guard.ts    # Route guard
│   │   ├── services/
│   │   │   ├── auth.service.ts         # Firebase Auth logic
│   │   │   └── google-sheets.service.ts # Google Sheets API integration
│   │   └── components/
│   │       ├── header/      # Header with user info
│   │       ├── footer/      # Footer component
│   │       ├── login/       # Login UI
│   │       └── home/        # Home UI with text editor
│   ├── environments/
│   │   └── environment.ts   # Firebase config
│   ├── main.ts              # App bootstrap
│   └── styles.scss          # Global styles
├── angular.json             # Angular config
├── package.json             # NPM scripts & dependencies
└── ...
```

---

## Configuration
- **Firebase:** Set credentials in `src/environments/environment.ts`.
- **Google API Scopes:** The app requires Google Sheets and Drive API access.
- **Auto-save Interval:** Configurable in `home.ts` (default: 25 seconds).
- **Angular Material Theme:** Uses `magenta-violet` prebuilt theme.
- **TypeScript:** Strict mode enabled.

## How It Works
1. **Authentication:** Users sign in with Google OAuth with Sheets/Drive permissions
2. **Spreadsheet Management:** App automatically creates a "Diary" spreadsheet if it doesn't exist
3. **Entry Management:** Each diary entry gets a unique UUID for consistent updates
4. **Versioning System:** Every change creates a new version with timestamps (created/updated)
5. **Auto-save:** Content is automatically saved to Google Sheets every 25 seconds (only when changed)
6. **Local Backup:** All entries are stored in localStorage for offline access
7. **Version History:** Previous versions are preserved and can be viewed
8. **Smart Updates:** New versions are created instead of overwriting existing entries

## Data Structure
Each diary entry contains:
- **Entry ID**: Unique UUID identifier
- **Text**: The diary content
- **Created At**: ISO timestamp when entry was first created
- **Updated At**: ISO timestamp when entry was last modified
- **Version**: Sequential version number
- **Is Current**: Boolean flag indicating if this is the latest version

---

## Useful Commands
- `ng generate component <name>` – Create a new component
- `ng generate service <name>` – Create a new service
- `ng test` – Run unit tests
- `ng build` – Build the app

---

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License
[MIT](LICENSE)
