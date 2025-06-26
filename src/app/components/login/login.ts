import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  constructor(private auth: AuthService, private router: Router) { }

  login() {
    this.auth.loginWithGoogle().then(() => {
      this.router.navigate(['/home']);
    });
  }
}
