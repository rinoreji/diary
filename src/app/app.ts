import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  constructor(public auth: AuthService) {}
  login() {
    this.auth.loginWithGoogle().then(userCredential => {
      console.log('Logged in:', userCredential.user.displayName);
    });
  }

  logout() {
    this.auth.logout();
  }
  protected title = 'Diary';
}
