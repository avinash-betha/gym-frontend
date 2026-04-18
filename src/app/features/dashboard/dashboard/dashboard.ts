import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface ExerciseMediaDTO {
  url: string;
  type: string;
}

interface ExerciseDTO {
  id: number;
  name: string;
  muscleGroup: string;
  type: string;
  media: ExerciseMediaDTO[];
}

interface WorkoutResponseDTO {
  day: number;
  workoutDate: string;
  muscleGroups: string;
  workoutType: string;
  rest: boolean;
  exercises: ExerciseDTO[];
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

interface ExerciseLogEntry {
  sets: number;
  reps: number;
  weight: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit, OnDestroy {

  workout: WorkoutResponseDTO | null = null;
  loading = true;
  error = '';
  noWorkout = false;
  firstName = '';
  greeting = '';

  selectedExerciseId: number | null = null;
  todayLogsMap: any = {};
  exerciseInputs: any = {};
  savedLogs: Record<number, boolean> = {};

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
    this.noWorkout = false;
    this.workout = null;
    this.selectedExerciseId = null;
    this.exerciseInputs = {};
    this.todayLogsMap = {};
    this.savedLogs = {};

    this.http.get<ApiResponse<WorkoutResponseDTO>>(`${environment.apiBaseUrl}/api/workout/today`)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: res => {
          if (res?.success && res.data) {
            this.noWorkout = false;
            this.workout = {
              day: res.data.day,
              workoutDate: res.data.workoutDate,
              muscleGroups: res.data.muscleGroups || '',
              workoutType: res.data.workoutType || '',
              rest: !!res.data.rest,
              exercises: Array.isArray(res.data.exercises) ? res.data.exercises : []
            };
            this.loadTodayLogs();
          } else {
            this.noWorkout = false;
            this.error = res?.message || 'Failed to load workout';
          }
        },
        error: err => {
          if (err?.status === 404) {
            this.workout = null;
            this.error = '';
            this.noWorkout = true;
          } else if (err.status === 403) {
            this.noWorkout = false;
            this.error = 'Session expired. Please login again.';
          } else {
            this.noWorkout = false;
            this.error = 'Failed to load workout';
          }
          this.loading = false;
        }
      });
  }

  loadTodayLogs() {
    this.http.get<any>(`${environment.apiBaseUrl}/api/workout/logs/today`).subscribe({
      next: (res: any) => {
        if (res?.success && Array.isArray(res.data)) {
          this.todayLogsMap = {};
          res.data.forEach((item: any) => {
            this.todayLogsMap[item.exerciseId] = Array.isArray(item.logs) ? item.logs : [];
          });
          this.cdr.detectChanges();
        }
      },
      error: () => {
      }
    });
  }

  toggleExercise(exerciseId: number): void {
    this.selectedExerciseId = this.selectedExerciseId === exerciseId ? null : exerciseId;
  }

  isExerciseExpanded(exerciseId: number): boolean {
    return this.selectedExerciseId === exerciseId;
  }

  getExerciseInput(exerciseId: number) {
    if (!this.exerciseInputs[exerciseId]) {
      this.exerciseInputs[exerciseId] = { sets: '', reps: '', weight: '' };
    }
    return this.exerciseInputs[exerciseId];
  }

  deletingLogId: number | null = null;

  saveExerciseLog(exerciseId: number): void {
    const input = this.getExerciseInput(exerciseId);
    const sets = Number(input.sets);
    const reps = Number(input.reps);
    const weight = Number(input.weight);

    if (!sets || !reps || !weight) {
      return;
    }

    this.http.post<ApiResponse<ExerciseLogEntry>>(`${environment.apiBaseUrl}/api/workout/log`, {
      exerciseId,
      sets,
      reps,
      weight
    }).subscribe({
      next: (res) => {
        if (res?.success) {
          this.savedLogs[exerciseId] = true;

          // Optimistically append the new log immediately so UI updates on first save
          if (!this.todayLogsMap[exerciseId]) {
            this.todayLogsMap[exerciseId] = [];
          }
          this.todayLogsMap[exerciseId] = [...this.todayLogsMap[exerciseId], { sets, reps, weight }];
          this.exerciseInputs[exerciseId] = {};
          this.cdr.detectChanges();

          // Sync with backend in the background to keep data accurate
          this.loadTodayLogs();
        }
      },
      error: () => {
      }
    });
  }

  deleteLog(exerciseId: number, logId: number, index: number): void {
    if (!logId) {
      // No backend id yet (optimistically added); remove locally only
      this.todayLogsMap[exerciseId] = this.todayLogsMap[exerciseId].filter((_: any, i: number) => i !== index);
      this.cdr.detectChanges();
      return;
    }

    this.deletingLogId = logId;
    this.cdr.detectChanges();

    this.http.delete<any>(`${environment.apiBaseUrl}/api/workout/log/${logId}`).subscribe({
      next: () => {
        this.todayLogsMap[exerciseId] = this.todayLogsMap[exerciseId].filter((_: any, i: number) => i !== index);
        this.deletingLogId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.deletingLogId = null;
        this.cdr.detectChanges();
      }
    });
  }

  isImageMedia(type: string): boolean {
    return (type || '').toLowerCase() === 'image';
  }

  isVideoMedia(type: string): boolean {
    return (type || '').toLowerCase() === 'video';
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
