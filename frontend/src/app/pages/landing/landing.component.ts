import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@auth0/auth0-angular';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit, OnDestroy {
  greeting = '';
  currentTime = '';
  currentDate = '';
  private timeInterval: ReturnType<typeof setInterval> | null = null;

  constructor(public auth: AuthService) { }

  ngOnInit() {
    this.updateTime();
    this.updateGreeting();
    this.timeInterval = setInterval(() => this.updateTime(), 1000);
  }

  ngOnDestroy() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  private updateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    this.currentDate = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }

  private updateGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
      this.greeting = 'Good morning';
    } else if (hour < 17) {
      this.greeting = 'Good afternoon';
    } else {
      this.greeting = 'Good evening';
    }
  }

  login() {
    this.auth.loginWithRedirect();
  }

  signup() {
    this.auth.loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup'
      }
    });
  }
}
