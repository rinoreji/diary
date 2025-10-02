import { inject, Injector } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const injector = inject(Injector);
  const auth = injector.get(Auth);
  const authService = injector.get(AuthService);
  const router = injector.get(Router);

  return new Promise<boolean>((resolve) => {
    // Check if already authenticated (including stored tokens)
    if (authService.isAuthenticated()) {
      resolve(true);
      return;
    }

    // If not, wait for auth state change
    const unsub = auth.onAuthStateChanged(user => {
      unsub();
      if (user) {
        resolve(true);
      } else {
        router.navigate(['/login']);
        resolve(false);
      }
    });
  });
};
