import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';

@Component({
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.html',
  styleUrls: ['./history.css']
})
export class History implements OnInit {

  historyData: any[] = [];
  loading = true;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    this.loading = true;
    this.http.get<any>(`${environment.apiBaseUrl}/api/workout/history`).subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.historyData = Array.isArray(res.data) ? res.data : [];
        } else {
          this.historyData = [];
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.historyData = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
