import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@auth0/auth0-angular';
import { environment } from '../../../environments/environment';
import * as Sentry from '@sentry/angular';


interface WeatherData {
  location: string;
  temperature: number;
  feelsLike: number;
  heatIndex: number;
  dewpoint: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  gust: number;
  pressure: number;
  units: 'metric' | 'imperial';
}

interface RaceData {
  motogp: any[];
  f1: any[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  weather: WeatherData | null = null;
  weatherError: string | null = null;
  races: RaceData | null = null;
  userUnits: 'metric' | 'imperial' = 'imperial';

  greeting = '';
  currentTime = '';
  currentDate = '';
  userName = '';
  private timeInterval: ReturnType<typeof setInterval> | null = null;

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) { }

  ngOnInit() {
    this.updateTime();
    this.updateGreeting();
    this.timeInterval = setInterval(() => this.updateTime(), 1000);

    this.auth.user$.subscribe(user => {
      if (user) {
        this.userName = user.given_name || user.name?.split(' ')[0] || 'Welcome back';
        Sentry.setUser({
          id: user.sub,
          email: user.email,
          username: user.name,
        });
      }
    });

    // Load user preferences first to get measurement units
    this.http.get<any>(`${this.apiUrl}/preferences`)
      .subscribe({
        next: (prefs) => {
          this.userUnits = prefs.measurementUnits || 'imperial';
          this.loadWeather();
        },
        error: () => {
          this.loadWeather();
        }
      });

    this.loadRaces();
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

  loadWeather() {
    this.weatherError = null;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          this.http.get<WeatherData>(`${this.apiUrl}/weather?lat=${lat}&lon=${lon}&units=${this.userUnits}`)
            .subscribe({
              next: (data) => this.weather = data,
              error: () => this.weatherError = 'Failed to load weather data'
            });
        },
        () => {
          this.http.get<WeatherData>(`${this.apiUrl}/weather?city=London&units=${this.userUnits}`)
            .subscribe({
              next: (data) => this.weather = data,
              error: () => this.weatherError = 'Failed to load weather data'
            });
        }
      );
    }
  }

  getTempUnit(): string {
    return this.weather?.units === 'metric' ? '°C' : '°F';
  }

  getSpeedUnit(): string {
    return this.weather?.units === 'metric' ? 'km/h' : 'mph';
  }

  getPressureUnit(): string {
    return this.weather?.units === 'metric' ? 'mb' : 'in';
  }

  loadRaces() {
    this.http.get<RaceData>(`${this.apiUrl}/races/upcoming`)
      .subscribe({
        next: (data) => this.races = data,
        error: (err) => console.error('Failed to load races', err)
      });
  }

  testSentryError() {
    throw new Error('Test Sentry Error - Frontend');
  }

  logout() {
    this.auth.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  }
}
