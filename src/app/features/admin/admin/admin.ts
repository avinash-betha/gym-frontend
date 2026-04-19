import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { AdminExercisesComponent } from '../exercises/admin-exercises.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, NgOptimizedImage, AdminExercisesComponent],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css']
})
export class Admin implements OnInit {

  activeTab: 'users' | 'configs' | 'requests' | 'exercises' = 'users';

  // ── Users ──────────────────────────────────────────
  users: any[] = [];
  usersLoading = true;
  usersError = '';

  // Per-row editing state (split/role inline)
  editingSplit: { [id: number]: number } = {};
  editingRole: { [id: number]: string } = {};
  savingId: number | null = null;

  // Full user edit modal
  showEditModal = false;
  editingUser: any = null;
  editForm = {
    firstName: '', lastName: '', email: '',
    newPassword: '', weight: null as number | null,
    splitDays: null as number | null,
    profileCompleted: false, profilePicUrl: ''
  };
  saving = false;
  saveError = '';

  // Profile pic upload (in edit modal)
  editPreviewUrl = '';
  editUploading = false;
  editRemoving = false;

  // Delete / suspend
  deletingUserId: number | null = null;
  suspendingId: number | null = null;

  // ── Configs ────────────────────────────────────────
  configs: any[] = [];
  configsLoading = true;
  configsError = '';

  newMuscleGroup = '';
  newType = '';
  addingConfig = false;

  deletingConfigId: number | null = null;

  // ── Workout Requests ───────────────────────────────
  requests: any[] = [];
  requestsLoading = false;
  requestsError = '';
  generatingUserId: number | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit() {
    this.loadUsers();
    this.loadConfigs();
    this.loadRequests();
  }

  // ── Tab ────────────────────────────────────────────
  setTab(tab: 'users' | 'configs' | 'requests' | 'exercises') {
    this.activeTab = tab;
    if (tab === 'requests') this.loadRequests();
  }

  openExercises() {
    this.setTab('exercises');
  }

  // ── Users ──────────────────────────────────────────
  loadUsers() {
    this.usersLoading = true;
    this.usersError = '';
    this.http.get<any>(`${environment.apiBaseUrl}/api/admin/users`).subscribe({
      next: res => {
        this.users = res.data || [];
        this.users.forEach(u => {
          this.editingSplit[u.id] = u.splitDays ?? 0;
          this.editingRole[u.id] = u.role ?? 'USER';
        });
        this.usersLoading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.usersError = err?.error?.message || 'Failed to load users';
        this.usersLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  updateSplit(userId: number) {
    this.updateUserField(userId, 'split', {
      splitDays: this.editingSplit[userId]
    });
  }

  updateRole(userId: number) {
    this.updateUserField(userId, 'role', {
      role: this.editingRole[userId]
    });
  }

  private updateUserField(userId: number, endpoint: 'split' | 'role', payload: any) {
    this.savingId = userId;
    this.http.put<any>(`${environment.apiBaseUrl}/api/admin/users/${userId}/${endpoint}`, payload).subscribe({
      next: res => {
        const idx = this.users.findIndex(u => u.id === userId);
        if (idx > -1) this.users[idx] = res.data;
        this.savingId = null;
        this.cdr.detectChanges();
      },
      error: () => { this.savingId = null; this.cdr.detectChanges(); }
    });
  }

  // ── Configs ────────────────────────────────────────
  loadConfigs() {
    this.configsLoading = true;
    this.configsError = '';
    this.http.get<any>(`${environment.apiBaseUrl}/api/admin/configs`).subscribe({
      next: res => {
        this.configs = res.data || [];
        this.configsLoading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.configsError = err?.error?.message || 'Failed to load configs';
        this.configsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  addConfig() {
    if (!this.newMuscleGroup.trim()) return;
    this.addingConfig = true;
    this.http.post<any>(`${environment.apiBaseUrl}/api/admin/configs`, {
      muscleGroup: this.newMuscleGroup.trim(),
      type: this.newType.trim() || null
    }).subscribe({
      next: res => {
        this.configs.push(res.data);
        this.newMuscleGroup = '';
        this.newType = '';
        this.addingConfig = false;
        this.cdr.detectChanges();
      },
      error: () => { this.addingConfig = false; this.cdr.detectChanges(); }
    });
  }

  deleteConfig(id: number) {
    this.deletingConfigId = id;
    this.http.delete<any>(`${environment.apiBaseUrl}/api/admin/configs/${id}`).subscribe({
      next: () => {
        this.configs = this.configs.filter(c => c.id !== id);
        this.deletingConfigId = null;
        this.cdr.detectChanges();
      },
      error: () => { this.deletingConfigId = null; this.cdr.detectChanges(); }
    });
  }

  // ── Workout Requests ───────────────────────────────
  loadRequests() {
    this.requestsLoading = true;
    this.requestsError = '';
    this.http.get<any>(`${environment.apiBaseUrl}/api/admin/workout-requests`).subscribe({
      next: res => {
        this.requests = res.data || [];
        this.requestsLoading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        this.requestsError = err?.error?.message || 'Failed to load requests';
        this.requestsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  generateNow(userId: number) {
    this.generatingUserId = userId;
    this.http.post<any>(`${environment.apiBaseUrl}/api/admin/workout-requests/${userId}/generate`, {}).subscribe({
      next: () => {
        this.requests = this.requests.filter(r => r.userId !== userId);
        this.generatingUserId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.generatingUserId = null;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Full Edit Modal ────────────────────────────────
  openEdit(user: any) {
    this.editingUser = user;
    this.editForm = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      newPassword: '',
      weight: user.weight ?? null,
      splitDays: user.splitDays ?? null,
      profileCompleted: user.profileCompleted || false,
      profilePicUrl: ''
    };
    this.editPreviewUrl = '';
    this.saveError = '';
    this.showEditModal = true;
  }


  onAdminFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const userId = this.editingUser?.id;
    if (!userId) return;

    // Instant local preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.zone.run(() => {
        this.editPreviewUrl = e.target.result;
        this.cdr.detectChanges();
      });
    };
    reader.readAsDataURL(file);

    this.zone.run(() => { this.editUploading = true; this.cdr.detectChanges(); });

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<any>(
      `${environment.apiBaseUrl}/api/admin/users/${userId}/profile-pic`,
      formData
    ).subscribe({
      next: (res) => {
        this.editingUser.profilePicUrl = res.data.profilePicUrl;
        this.editPreviewUrl = '';
        this.zone.run(() => {
          this.editUploading = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('Upload failed:', err);
        this.editPreviewUrl = '';
        this.zone.run(() => {
          this.editUploading = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  closeEdit() {
    this.showEditModal = false;
    this.editingUser = null;
  }

  async removeEditPic() {
    if (!this.editingUser) return;
    const userId = this.editingUser.id;
    this.zone.run(() => { this.editRemoving = true; this.cdr.detectChanges(); });
    this.http.delete<any>(`${environment.apiBaseUrl}/api/admin/users/${userId}/profile-pic`).subscribe({
      next: () => {
        this.zone.run(() => {
          this.editingUser.profilePicUrl = '';
          const idx = this.users.findIndex(u => u.id === userId);
          if (idx > -1) this.users[idx].profilePicUrl = '';
          this.editPreviewUrl = '';
          this.editRemoving = false;
          this.cdr.detectChanges();
        });
      },
      error: () => {
        this.zone.run(() => {
          this.editRemoving = false;
          this.cdr.detectChanges();
        });
      }
    });
  }

  async saveEdit() {
    if (!this.editingUser) return;
    const userId = this.editingUser.id;
    this.zone.run(() => { this.saving = true; this.saveError = ''; this.cdr.detectChanges(); });
    try {
      const { profilePicUrl: _profilePicUrl, ...payload } = this.editForm;
      const res = await lastValueFrom(
        this.http.put<any>(`${environment.apiBaseUrl}/api/admin/users/${userId}/details`, payload)
      );
      this.zone.run(() => {
        const idx = this.users.findIndex(u => u.id === userId);
        if (idx > -1) this.users[idx] = res.data;
        this.showEditModal = false;
        this.editingUser = null;
        this.saving = false;
        this.cdr.detectChanges();
      });
    } catch (err: any) {
      this.zone.run(() => {
        this.saveError = err?.error?.message || err?.message || 'Failed to save changes';
        this.saving = false;
        this.cdr.detectChanges();
      });
    }
  }

  // ── Delete ─────────────────────────────────────────
  deleteUser(userId: number) {
    if (!confirm('Permanently delete this user and all their data?')) return;
    this.deletingUserId = userId;
    this.http.delete<any>(`${environment.apiBaseUrl}/api/admin/users/${userId}`).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== userId);
        this.deletingUserId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.deletingUserId = null;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Suspend / Unsuspend ────────────────────────────
  toggleSuspend(user: any) {
    const newState = !user.suspended;
    const action = newState ? 'suspend' : 'unsuspend';
    if (!confirm(`Are you sure you want to ${action} ${user.firstName || 'this user'}?`)) return;
    this.suspendingId = user.id;
    this.http.put<any>(
      `${environment.apiBaseUrl}/api/admin/users/${user.id}/suspend`,
      { suspended: newState }
    ).subscribe({
      next: res => {
        const idx = this.users.findIndex(u => u.id === user.id);
        if (idx > -1) this.users[idx] = res.data;
        this.suspendingId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.suspendingId = null;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Auth ───────────────────────────────────────────
  logout() {
    this.authService.logout();
    localStorage.clear();
    void this.router.navigate(['/login']);
  }
}
