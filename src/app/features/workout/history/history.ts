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

  history: any[] = [];
  loading = true;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {

    this.loading = true;

    this.http.get<any>(`${environment.apiBaseUrl}/api/workout/history`)
      .subscribe({
        next: res => {
          console.log("History Response:", res);
          this.history = res.data || [];
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
}