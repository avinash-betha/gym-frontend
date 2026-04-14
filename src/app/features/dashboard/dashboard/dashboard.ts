import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit, OnDestroy {

  workout: any = null;
  loading = true;
  error = '';
  firstName = '';
  greeting = '';

  requestLoading = false;
  requestSent = false;
  requestError = '';

  private midnightTimer: any = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log("Dashboard rendered");

    const token = this.authService.getToken();
    console.log("Dashboard Init Token:", token);

    if (!token) {
      this.error = 'User not logged in';
      this.loading = false;
      return;
    }

    // Greeting: first login in session = "Hi", subsequent = "Welcome back"
    const isFirstVisit = !sessionStorage.getItem('dashboardVisited');
    sessionStorage.setItem('dashboardVisited', '1');

    // Try localStorage first to avoid extra API call
    const cached = localStorage.getItem('firstName');
    if (cached) {
      this.firstName = cached;
      this.greeting = isFirstVisit ? `Hi, ${cached} 👋` : `Welcome back, ${cached}`;
      this.cdr.detectChanges();
    } else {
      this.http.get<any>(`${environment.apiBaseUrl}/api/users/me`).subscribe({
        next: res => {
          this.firstName = res.data?.firstName || '';
          localStorage.setItem('firstName', this.firstName);
          this.greeting = isFirstVisit ? `Hi, ${this.firstName} 👋` : `Welcome back, ${this.firstName}`;
          this.cdr.detectChanges();
        }
      });
    }

    this.loadWorkout();
    this.scheduleMidnightRefresh();

    // Restore request-sent state for today
    const sentDate = localStorage.getItem('workoutRequestedDate');
    if (sentDate === new Date().toISOString().split('T')[0]) {
      this.requestSent = true;
    }
  }

  scheduleMidnightRefresh() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    this.midnightTimer = setTimeout(() => {
      this.loadWorkout();
      this.scheduleMidnightRefresh();
    }, msUntilMidnight);
  }

  ngOnDestroy() {
    if (this.midnightTimer) clearTimeout(this.midnightTimer);
  }

  loadWorkout() {
    this.loading = true;
    this.error = '';

    this.http.get<any>(`${environment.apiBaseUrl}/api/workout/today`)
      .pipe(
        finalize(() => {
          // DEBUG #1 — Is loading being set to false?
          this.loading = false;
          console.log("loading:", this.loading);
          // Force change detection in case Angular misses the update
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: res => {
          console.log("Full Response:", res);

          // DEBUG #5 — Is API returning empty or null data?
          console.log("res.data:", res.data);

          if (res.success) {
            this.workout = res.data;
            // DEBUG #2 — Is workout assigned properly?
            console.log("workout assigned:", this.workout);
          } else {
            this.error = res.message;
          }
        },
        error: err => {
          console.error("API Error:", err);

          if (err.status === 403) {
            this.error = 'Session expired. Please login again.';
          } else {
            this.error = 'Failed to load workout';
          }
        }
      });
  }

  requestWorkout() {
    this.requestLoading = true;
    this.requestError = '';
    this.http.post<any>(`${environment.apiBaseUrl}/api/workout/request`, {}).subscribe({
      next: res => {
        if (res.success) {
          this.requestSent = true;
          localStorage.setItem('workoutRequestedDate', new Date().toISOString().split('T')[0]);
        } else {
          this.requestError = res.message || 'Could not send request';
        }
        this.requestLoading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.requestError = err?.error?.message || 'Failed to send request';
        this.requestLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
}