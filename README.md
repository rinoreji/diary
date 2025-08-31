

# Diary


A modern diary web application built with Angular 20, Angular Material, and Firebase authentication (Google Sign-In). Easily extensible, with protected routes and a clean architecture.

---

## Features
- **Google Authentication** (Firebase)
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
│   │   │   └── auth.service.ts # Auth logic
│   │   └── components/
│   │       ├── login/       # Login UI
│   │       └── home/        # Home UI
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
- **Angular Material Theme:** Uses `magenta-violet` prebuilt theme.
- **TypeScript:** Strict mode enabled.

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
