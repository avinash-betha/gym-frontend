import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
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

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toast: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  login() {

    // basic validation
    if (!this.email || !this.password) {
      this.toast.showError('Please enter email and password');
      this.loading = false;
      return;
    }

    this.loading = true;

    this.http.post<any>(`${environment.apiBaseUrl}/api/auth/login`, {
      email: this.email,
      password: this.password
    }).pipe(
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: res => {

        const data = res.data;

        // Save user info
        this.authService.saveToken(data.token);
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('profilePicUrl', data.profilePicUrl || '');
        localStorage.setItem('firstName', data.firstName || '');
        localStorage.setItem('role', data.role || 'USER');

        this.toast.showSuccess('Welcome back!');

        this.loading = false;

        // Route based on role & profile state
        if (data.role === 'ADMIN') {
          void this.router.navigate(['/admin']);
        } else if (!data.profileCompleted) {
          void this.router.navigate(['/profile']);
        } else {
          void this.router.navigate(['/dashboard']);
        }
      },

      error: err => {
        console.error("Login error:", err);
      }
    });
  }
}
