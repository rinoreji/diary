import { inject, Injector } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const injector = inject(Injector);
  const auth = injector.get(Auth);
  const router = injector.get(Router);

  return new Promise<boolean>((resolve) => {
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
