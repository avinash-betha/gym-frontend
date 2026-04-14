import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly TOKEN_KEY = 'gym_token';

  // Save token
  saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    console.log('Token saved:', token);
  }

  // Get token (always from localStorage)
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // Remove token (logout)
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    console.log('User logged out');
  }

  // Check login status
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // Get role from localStorage
  getRole(): string {
    return localStorage.getItem('role') || 'USER';
  }

  // Optional: Get Authorization header (clean usage)
  getAuthHeader(): { Authorization: string } | {} {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}