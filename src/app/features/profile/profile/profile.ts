import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';

@Component({
  standalone: true,
  imports: [FormsModule, CommonModule],
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

  profilePicUrl = '';   // URL stored in Supabase / DB
  previewUrl = '';      // local blob preview while uploading

  // Password
  oldPassword = '';
  newPassword = '';

  loading = true;
  uploading = false;

  constructor(
    private http: HttpClient,
    private supabaseService: SupabaseService,
    private authService: AuthService,
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
      .subscribe({
        next: res => {
          const user = res.data;

          this.firstName = user.firstName || '';
          this.lastName = user.lastName || '';
          this.email = user.email || '';

          this.splitDays = user.splitDays;
          this.weight = user.weight;
          this.profilePicUrl = user.profilePicUrl || '';

          // also cache locally (for navbar)
          if (this.profilePicUrl) {
            localStorage.setItem('profilePicUrl', this.profilePicUrl);
          }

          this.loading = false;
          this.cdr.detectChanges();
        },
        error: err => {
          console.error("Profile load failed", err);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  // LOGOUT
  logout() {
    this.authService.logout();
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  // IMAGE UPLOAD
  async onFile(event: any) {

    const file = event.target.files[0];
    if (!file) return;

    const userId = localStorage.getItem('userId');
    if (!userId) {
      alert('User not found. Please login again.');
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

    try {
      const supabase = this.supabaseService.getClient();
      const filePath = `${userId}/profile.jpg`;

      // Remove old file (ignore if it doesn't exist)
      const { error: removeError } = await supabase.storage
        .from('profile-pics')
        .remove([filePath]);
      if (removeError) {
        console.warn('Old image remove failed (may not exist):', removeError.message);
      }

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('profile-pics')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '0'
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('profile-pics')
        .getPublicUrl(filePath);

      // Set the real URL with cache-bust, clear local preview
      this.profilePicUrl = `${data.publicUrl}?t=${Date.now()}`;
      this.previewUrl = '';
      localStorage.setItem('profilePicUrl', this.profilePicUrl);

    } catch (err: any) {
      console.error('Upload failed:', err);
      alert(err.message || 'Image upload failed');
      // Revert preview so UI shows original image
      this.previewUrl = '';
    } finally {
      this.zone.run(() => {
        this.uploading = false;
        this.cdr.detectChanges();
      });
    }
  }

  // REMOVE PROFILE PIC
  async removeProfilePic() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    this.zone.run(() => { this.uploading = true; this.cdr.detectChanges(); });
    try {
      const supabase = this.supabaseService.getClient();
      await supabase.storage.from('profile-pics').remove([`${userId}/profile.jpg`]);
    } catch (err) {
      console.warn('Supabase remove error (ignored):', err);
    }
    // persist empty URL to DB
    this.http.put(`${environment.apiBaseUrl}/api/users/${userId}`, {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      splitDays: this.splitDays,
      weight: this.weight,
      profilePicUrl: ''
    }).subscribe({ error: err => console.error('Failed to clear pic in DB', err) });
    this.zone.run(() => {
      this.profilePicUrl = '';
      this.previewUrl = '';
      localStorage.removeItem('profilePicUrl');
      this.uploading = false;
      this.cdr.detectChanges();
    });
  }

  // SAVE PROFILE
  save() {

    const userId = localStorage.getItem('userId');

    if (!userId) {
      alert("User not found. Please login again.");
      return;
    }

    if (!this.splitDays || !this.weight) {
      alert("Please fill Split Days and Weight");
      return;
    }

    this.http.put(`${environment.apiBaseUrl}/api/users/${userId}`, {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      splitDays: this.splitDays,
      weight: this.weight,
      profilePicUrl: this.profilePicUrl
    }).subscribe({
      next: () => {
        localStorage.setItem('firstName', this.firstName);
        alert("Profile saved successfully");
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        console.error("Save error:", err);
        alert("Failed to save profile");
      }
    });
  }

  // CHANGE PASSWORD
  changePassword() {

    if (!this.oldPassword || !this.newPassword) {
      alert("Enter both passwords");
      return;
    }

    this.http.post(`${environment.apiBaseUrl}/api/users/change-password`, {
      oldPassword: this.oldPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        alert("Password updated successfully");
        this.oldPassword = '';
        this.newPassword = '';
      },
      error: err => {
        console.error(err);
        alert("Failed to update password");
      }
    });
  }
}