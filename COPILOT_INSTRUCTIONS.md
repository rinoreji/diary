# Copilot Instructions for the Diary Project

Welcome, Copilot! This guide will help you quickly understand and contribute to the Diary project.

## Project Overview
- **Type:** Angular 20 SPA
- **Purpose:** Diary app with Google authentication
- **UI:** Angular Material
- **Auth:** Firebase (Google Sign-In)
- **Routing:** Protected home, login, fallback to home

## Key Files & Structure
- `src/main.ts` – App bootstrap
- `src/app/app.ts` – Root component
- `src/app/app.routes.ts` – Route definitions
- `src/app/auth-guard.ts` – Route guard for authentication
- `src/app/services/auth.service.ts` – Auth logic (login/logout)
- `src/app/components/login/` – Login UI
- `src/app/components/home/` – Home UI
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
- Auth is handled via `AuthService` using Firebase.
- Deployment is automated to GitHub Pages via GitHub Actions.

## Useful Commands
- `ng generate component <name>` – Create a new component
- `ng generate service <name>` – Create a new service
- `ng test` – Run unit tests
- `ng build` – Build the app

## Additional Info
- See `README.md` for more details on setup and usage.
- For Firebase config, check `src/environments/environment.ts`.
- For deployment, see `.github/workflows/deploy.yml`.

---
Happy coding!
