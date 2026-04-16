import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './signup.html',
  styleUrls: ['./signup.css']
})
export class Signup {

  firstName = '';
  lastName = '';
  email = '';
  password = '';

  loading = false;
  error = '';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
  ) {}

  signup() {

    // Validation
    if (!this.firstName || !this.lastName || !this.email || !this.password) {
      this.error = 'Please fill all fields';
      return;
    }

    this.loading = true;
    this.error = '';

    this.http.post<any>(`${environment.apiBaseUrl}/api/auth/signup`, {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      password: this.password
    }).subscribe({
      next: res => {

        const data = res.data;

        // Save token
        this.auth.saveToken(data.token);

        // Save user info (VERY IMPORTANT)
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('profilePicUrl', data.profilePicUrl || '');


        // Always go to profile setup (first-time user)
        this.router.navigate(['/profile']);

        this.loading = false;
      },

      error: err => {
        console.error("Signup error:", err);

        this.error = err?.error?.message || 'Signup failed';
        this.loading = false;
      }
    });
  }
}
