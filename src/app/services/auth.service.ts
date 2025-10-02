import { Injectable } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from '@angular/fire/auth';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(private auth: Auth) {
    // Listen for auth state changes
    onAuthStateChanged(this.auth, (user) => {
      this.currentUserSubject.next(user);
      if (user) {
        console.log('User signed in:', user.displayName);
      } else {
        console.log('User signed out');
        this.clearTokens();
      }
    });

    // Load stored access token on service initialization
    this.loadStoredToken();
  }

  private loadStoredToken(): void {
    const storedToken = localStorage.getItem('googleAccessToken');
    const storedExpiry = localStorage.getItem('googleTokenExpiry');
    
    if (storedToken && storedExpiry) {
      const expiryTime = parseInt(storedExpiry);
      if (Date.now() < expiryTime) {
        this.accessToken = storedToken;
        this.tokenExpiry = expiryTime;
        console.log('Loaded stored access token, expires in:', Math.round((expiryTime - Date.now()) / 1000 / 60), 'minutes');
      } else {
        console.log('Stored token expired, clearing...');
        this.clearTokens();
      }
    }
  }

  private storeToken(token: string, expiresIn: number = 3600): void {
    this.accessToken = token;
    this.tokenExpiry = Date.now() + (expiresIn * 1000); // expiresIn is in seconds
    
    localStorage.setItem('googleAccessToken', token);
    localStorage.setItem('googleTokenExpiry', this.tokenExpiry.toString());
    
    console.log('Token stored, expires in:', expiresIn / 60, 'minutes');
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.tokenExpiry = null;
    localStorage.removeItem('googleAccessToken');
    localStorage.removeItem('googleTokenExpiry');
  }

  async getValidAccessToken(): Promise<string> {
    // Check if we have a valid stored token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      console.log('Using existing valid token');
      return this.accessToken;
    }

    // Check if user is signed in but token is expired
    if (this.auth.currentUser) {
      console.log('Token expired, refreshing...');
      try {
        const token = await this.auth.currentUser.getIdToken(true); // Force refresh
        // Note: This gets Firebase ID token, not Google API access token
        // We need to re-authenticate for Google API access token
        return await this.loginWithGoogle();
      } catch (error) {
        console.error('Error refreshing token:', error);
        return await this.loginWithGoogle();
      }
    }

    // No valid token and no user, need to login
    console.log('No valid token, requesting login...');
    return await this.loginWithGoogle();
  }

  loginWithGoogle(): Promise<string> {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    provider.addScope('https://www.googleapis.com/auth/drive');
    
    // Force account selection to avoid auto-selecting cached account
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    return signInWithPopup(this.auth, provider).then((result) => {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      
      if (!accessToken) {
        throw new Error('Failed to retrieve access token');
      }
      
      // Store the token with expiry (Google tokens typically expire in 1 hour)
      this.storeToken(accessToken, 3600);
      
      console.log('Successfully authenticated with Google');
      return accessToken;
    }).catch((error) => {
      console.error('Google sign-in error:', error);
      throw error;
    });
  }

  logout() {
    this.clearTokens();
    return signOut(this.auth);
  }

  get currentUser() {
    return this.auth.currentUser;
  }

  // Check if user is authenticated (either Firebase auth or valid token)
  isAuthenticated(): boolean {
    return !!(this.auth.currentUser || (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry));
  }
}
