import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {

  email = '';
  password = '';
  loading = false;
  error = '';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  login() {

    // basic validation
    if (!this.email || !this.password) {
      this.error = 'Please enter email and password';
      return;
    }

    this.loading = true;
    this.error = '';

    this.http.post<any>(`${environment.apiBaseUrl}/api/auth/login`, {
      email: this.email,
      password: this.password
    }).subscribe({
      next: res => {

        const data = res.data;

        // Save user info
        this.authService.saveToken(data.token);
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('profilePicUrl', data.profilePicUrl || '');
        localStorage.setItem('firstName', data.firstName || '');
        localStorage.setItem('role', data.role || 'USER');

        console.log('Login success:', data);

        // Route based on role & profile state
        if (data.role === 'ADMIN') {
          this.router.navigate(['/admin']);
        } else if (!data.profileCompleted) {
          this.router.navigate(['/profile']);
        } else {
          this.router.navigate(['/dashboard']);
        }

        this.loading = false;
      },

      error: err => {
        console.error("Login error:", err);

        this.error = err?.error?.message || 'Invalid email or password';
        this.loading = false;
      }
    });
  }
}