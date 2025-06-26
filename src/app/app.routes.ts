import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { authGuard } from './auth-guard';
import { Login } from './components/login/login';

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'home', component: Home, canActivate: [authGuard] },
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: '**', redirectTo: 'home' }
];
