import { Component, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { BottomNav } from './shared/components/bottom-nav/bottom-nav';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BottomNav, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('gym-frontend');
  showNav = false;

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      const url: string = e.urlAfterRedirects;
      this.showNav = !url.includes('/login') && !url.includes('/signup') && !url.includes('/admin') && url !== '/';
    });
  }
}
