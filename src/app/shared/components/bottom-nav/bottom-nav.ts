import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bottom-nav.html',
  styleUrls: ['./bottom-nav.css']
})
export class BottomNav implements OnInit {

  profilePicUrl: string | null = null;
  activeRoute = '';

  constructor(private router: Router) {}

  ngOnInit() {
    this.profilePicUrl = localStorage.getItem('profilePicUrl');
    this.activeRoute = this.router.url;

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.activeRoute = e.urlAfterRedirects;
      this.profilePicUrl = localStorage.getItem('profilePicUrl');
    });
  }

  go(path: string) {
    this.router.navigate(['/' + path]);
  }
}