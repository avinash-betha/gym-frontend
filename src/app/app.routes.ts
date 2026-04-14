import { Routes } from '@angular/router';
import { Dashboard } from './features/dashboard/dashboard/dashboard';
import { Login } from './features/auth/login/login';
import { authGuard } from './core/gaurds/auth.guard';
import { adminGuard } from './core/gaurds/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: 'signup',
    loadComponent: () => import('./features/auth/signup/signup').then(m => m.Signup)
  },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile/profile').then(m => m.Profile),
    canActivate: [authGuard]
  },
  {
    path: 'history',
    loadComponent: () => import('./features/workout/history/history').then(m => m.History),
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin/admin').then(m => m.Admin),
    canActivate: [adminGuard]
  }
];