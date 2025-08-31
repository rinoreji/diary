
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { Header } from './components/header/header';
import { Footer } from './components/footer/footer';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    Header,
    Footer,
    MatToolbarModule,
    MatTooltipModule,
    CommonModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  constructor(public auth: AuthService) {}
  login() {
    this.auth.loginWithGoogle().then(userCredential => {
      console.log('Logged in:', userCredential.user?.displayName);
    });
  }

  logout() {
    this.auth.logout();
  }

  protected title = 'Diary';
}
