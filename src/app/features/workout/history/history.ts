import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.html',
  styleUrls: ['./history.css']
})
export class History implements OnInit {

  history: any[] = [];
  loading = true;
  confirmDeleteId: number | null = null;
  deletingId: number | null = null;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    this.loading = true;
    this.http.get<any>(`${environment.apiBaseUrl}/api/workout/history`)
      .subscribe({
        next: res => {
          console.log("History Response:", res);
          const raw: any[] = res.data || [];
          // sort newest first
          this.history = raw.sort((a, b) => {
            const da = this.toDate(a.workoutDate);
            const db = this.toDate(b.workoutDate);
            return db.getTime() - da.getTime();
          });
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: err => {
          console.error(err);
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  deleteLog(id: number) {
    this.deletingId = id;
    this.http.delete<any>(`${environment.apiBaseUrl}/api/workout/history/${id}`)
      .subscribe({
        next: res => {
          if (res.success) {
            this.history = this.history.filter(h => h.id !== id);
            this.toast.showSuccess('Workout log deleted');
          } else {
            this.toast.showError(res.message || 'Could not delete log');
          }
          this.confirmDeleteId = null;
          this.deletingId = null;
          this.cdr.detectChanges();
        },
        error: () => {
          this.toast.showError('Failed to delete log');
          this.confirmDeleteId = null;
          this.deletingId = null;
          this.cdr.detectChanges();
        }
      });
  }

  getMuscleList(groups: string): string[] {
    if (!groups) return [];
    return groups.split(',').map(g => g.trim()).filter(g => g.length > 0);
  }

  formatDate(d: any): string {
    const date = this.toDate(d);
    return date.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  private toDate(d: any): Date {
    if (Array.isArray(d)) {
      // Java LocalDate serialized as [year, month, day] (month is 1-based)
      return new Date(d[0], d[1] - 1, d[2]);
    }
    return new Date(d);
  }
}