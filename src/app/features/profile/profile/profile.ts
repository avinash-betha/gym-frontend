import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  standalone: true,
  imports: [FormsModule, CommonModule, NgOptimizedImage],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class Profile implements OnInit {

  // 👤 Profile fields
  firstName = '';
  lastName = '';
  email = '';

  splitDays: number | null = null;
  weight: number | null = null;
  days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  selectedDays: string[] = [];
  originalDays: string[] = [];
  originalProfile = {
    firstName: '',
    lastName: '',
    email: '',
    weight: null as number | null
  };

  private readonly fullToShortMap: Record<string, string> = {
    MONDAY: 'MON',
    TUESDAY: 'TUE',
    WEDNESDAY: 'WED',
    THURSDAY: 'THU',
    FRIDAY: 'FRI',
    SATURDAY: 'SAT',
    SUNDAY: 'SUN'
  };

  private readonly shortToFullMap: Record<string, string> = {
    MON: 'MONDAY',
    TUE: 'TUESDAY',
    WED: 'WEDNESDAY',
    THU: 'THURSDAY',
    FRI: 'FRIDAY',
    SAT: 'SATURDAY',
    SUN: 'SUNDAY'
  };

  profilePicUrl = '';   // Image URL persisted by backend/DB
  previewUrl = '';      // local blob preview while uploading

  // Password
  oldPassword = '';
  newPassword = '';

  loading = true;
  uploading = false;
  savingProfile = false;
  error = '';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toast: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  // LOAD PROFILE
  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.loading = true;

    this.http.get<any>(`${environment.apiBaseUrl}/api/users/me`)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: res => {
          const user = (res?.data ?? res) ?? {};

          this.firstName = user.firstName || '';
          this.lastName = user.lastName || '';
          this.email = user.email || '';

          this.splitDays = user.splitDays;
          this.weight = user.weight;
          const backendWorkoutDays = Array.isArray(user.workoutDays)
            ? user.workoutDays
            : this.extractWorkoutDays(user);

          this.selectedDays = backendWorkoutDays
            .map((day: string) => this.mapToShortDay(day))
            .filter((day: string) => this.days.includes(day));

          console.log('Backend workoutDays:', user.workoutDays);
          console.log('Mapped selectedDays:', this.selectedDays);

          this.originalDays = [...this.selectedDays];
          this.originalProfile = {
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            weight: this.weight
          };
          this.profilePicUrl = user.profilePicUrl || '';

          // also cache locally (for navbar)
          if (this.profilePicUrl) {
            localStorage.setItem('profilePicUrl', this.profilePicUrl);
          }
        },
        error: err => {
          console.error("Profile load failed", err);
        }
      });
  }

  private mapToShortDay(day: string): string {
    const normalized = String(day || '').trim().toUpperCase();
    return this.fullToShortMap[normalized] || normalized;
  }

  private mapToFullDay(day: string): string {
    const normalized = String(day || '').trim().toUpperCase();
    return this.shortToFullMap[normalized] || normalized;
  }

  private extractWorkoutDays(user: any): string[] {
    const source = user?.workoutDays
      ?? user?.userWorkoutConfig?.workoutDays
      ?? user?.workoutConfig?.workoutDays
      ?? user?.userWorkoutConfig
      ?? [];

    if (!Array.isArray(source)) {
      return [];
    }

    const values = source
      .map((item: any) => {
        if (typeof item === 'string') return item;
        return item?.day ?? item?.dayOfWeek ?? item?.name ?? '';
      })
      .map((day: string) => this.mapToShortDay(day))
      .filter((day: string) => this.days.includes(day));

    return Array.from(new Set(values));
  }

  // LOGOUT
  logout() {
    this.authService.logout();
    localStorage.clear();
    void this.router.navigate(['/login']);
  }

  // IMAGE UPLOAD
  async onFile(event: any) {

    const file = event.target.files[0];
    if (!file) return;

    const userId = localStorage.getItem('userId');
    if (!userId) {
      this.toast.showInfo('User not found. Please login again.');
      return;
    }

    // Show instant local preview using FileReader (data: URL — safe for Angular [src])
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.zone.run(() => {
        this.previewUrl = e.target.result;
        this.cdr.detectChanges();
      });
    };
    reader.readAsDataURL(file);

    this.zone.run(() => {
      this.uploading = true;
      this.cdr.detectChanges();
    });

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<any>(
      `${environment.apiBaseUrl}/api/users/${userId}/profile-pic`,
      formData
    ).subscribe({
      next: (res) => {
        this.profilePicUrl = res.data.profilePicUrl;
        localStorage.setItem('profilePicUrl', this.profilePicUrl);
        this.toast.showSuccess('Profile picture updated');
        this.previewUrl = '';
        this.zone.run(() => {
          this.uploading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Upload failed:', err);
        this.previewUrl = '';
        this.zone.run(() => {
          this.uploading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // REMOVE PROFILE PIC
  async removeProfilePic() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    this.zone.run(() => { this.uploading = true; this.cdr.detectChanges(); });
    this.http.delete<any>(`${environment.apiBaseUrl}/api/users/${userId}/profile-pic`).subscribe({
      next: () => {
        this.zone.run(() => {
          this.profilePicUrl = '';
          this.previewUrl = '';
          localStorage.removeItem('profilePicUrl');
          this.toast.showSuccess('Profile picture removed');
          this.uploading = false;
          this.cdr.detectChanges();
        });
      },
      error: err => {
        console.error('Failed to clear pic in DB', err);
        this.zone.run(() => {
          this.uploading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  // SAVE PROFILE
  save() {

    if (this.savingProfile) {
      return;
    }

    const userId = localStorage.getItem('userId');

    if (!userId) {
      this.toast.showInfo('User not found. Please login again.');
      return;
    }

    if (!this.weight || this.selectedDays.length === 0) {
      this.toast.showInfo('Please select workout days and enter weight');
      return;
    }

    const currentDays = [...this.selectedDays].sort();
    const initialDays = [...this.originalDays].sort();
    const workoutDaysChanged = JSON.stringify(currentDays) !== JSON.stringify(initialDays);
    const profileFieldsChanged =
      this.firstName !== this.originalProfile.firstName ||
      this.lastName !== this.originalProfile.lastName ||
      this.email !== this.originalProfile.email ||
      this.weight !== this.originalProfile.weight;

    if (!workoutDaysChanged && !profileFieldsChanged) {
      this.toast.showInfo('No changes to save');
      return;
    }

    this.error = '';

    this.savingProfile = true;
    let shouldNavigate = false;

    this.http.put(`${environment.apiBaseUrl}/api/users/${userId}`, {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      weight: this.weight,
      workoutDays: this.selectedDays.map(day => this.mapToFullDay(day))
    }).pipe(
      finalize(() => {
        this.savingProfile = false;
        this.cdr.detectChanges();
        if (shouldNavigate) {
          void this.router.navigate(['/dashboard']);
        }
      })
    ).subscribe({
      next: () => {
        localStorage.setItem('firstName', this.firstName);
        this.originalDays = [...this.selectedDays];
        this.originalProfile = {
          firstName: this.firstName,
          lastName: this.lastName,
          email: this.email,
          weight: this.weight
        };
        this.toast.showSuccess('Profile updated successfully');
        shouldNavigate = true;
      },
      error: () => {
      }
    });
  }

  toggleDay(day: string) {
    if (this.selectedDays.includes(day)) {
      this.selectedDays = this.selectedDays.filter(d => d !== day);
    } else {
      this.selectedDays = [...this.selectedDays, day];
    }
  }

  // CHANGE PASSWORD
  changePassword() {

    if (!this.oldPassword || !this.newPassword) {
      this.toast.showInfo('Enter both passwords');
      return;
    }

    this.http.post(`${environment.apiBaseUrl}/api/users/change-password`, {
      oldPassword: this.oldPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.toast.showSuccess('Password updated successfully');
        this.oldPassword = '';
        this.newPassword = '';
      },
      error: err => {
        console.error(err);
      }
    });
  }
}
