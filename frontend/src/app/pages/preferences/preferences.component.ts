import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ThemeService, Theme } from '../../services/theme.service';

interface UserPreferences {
  favoriteTeams: string[];
  notifications: boolean;
  theme: string;
  measurementUnits: 'metric' | 'imperial';
}

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="preferences-container">
      <nav class="navbar">
        <div class="nav-brand">
          <span class="logo-icon">&#9670;</span>
          <span class="logo-text">Preferences</span>
        </div>
        <div class="nav-actions">
          <a routerLink="/dashboard" class="nav-link">Back to Dashboard</a>
        </div>
      </nav>

      <main class="content">
        <header class="page-header">
          <h1>Settings</h1>
          <p>Customize your dashboard experience</p>
        </header>

        <div class="settings-grid">
          <section class="settings-card" *ngIf="preferences; else loading">
            <div class="card-header">
              <span class="card-icon">&#9733;</span>
              <h2>Favorite Teams</h2>
            </div>
            <div class="card-content">
              <div class="input-group">
                <input
                  type="text"
                  [(ngModel)]="teamInput"
                  name="teamInput"
                  placeholder="Enter a team name"
                  (keyup.enter)="addTeam()"
                  class="form-input"
                />
                <button type="button" (click)="addTeam()" class="btn-add">Add</button>
              </div>

              <div class="teams-list">
                <div class="team-tag" *ngFor="let team of preferences.favoriteTeams">
                  <span>{{ team }}</span>
                  <button type="button" (click)="removeTeam(team)" class="btn-remove">&#10005;</button>
                </div>
                <div *ngIf="preferences.favoriteTeams.length === 0" class="empty-state">
                  No favorite teams added yet
                </div>
              </div>
            </div>
          </section>

          <section class="settings-card" *ngIf="preferences">
            <div class="card-header">
              <span class="card-icon">&#128276;</span>
              <h2>Notifications</h2>
            </div>
            <div class="card-content">
              <label class="toggle-label">
                <span class="toggle-text">Enable race notifications</span>
                <div class="toggle-switch">
                  <input
                    type="checkbox"
                    [(ngModel)]="preferences.notifications"
                    name="notifications"
                  />
                  <span class="toggle-slider"></span>
                </div>
              </label>
            </div>
          </section>

          <section class="settings-card" *ngIf="preferences">
            <div class="card-header">
              <span class="card-icon">&#127912;</span>
              <h2>Appearance</h2>
            </div>
            <div class="card-content">
              <label class="form-label">Theme</label>
              <div class="theme-options">
                <button
                  type="button"
                  class="theme-btn"
                  [class.active]="preferences.theme === 'light'"
                  (click)="setTheme('light')">
                  <span class="theme-icon">&#9788;</span>
                  Light
                </button>
                <button
                  type="button"
                  class="theme-btn"
                  [class.active]="preferences.theme === 'dark'"
                  (click)="setTheme('dark')">
                  <span class="theme-icon">&#9790;</span>
                  Dark
                </button>
              </div>
            </div>
          </section>

          <section class="settings-card" *ngIf="preferences">
            <div class="card-header">
              <span class="card-icon">&#127777;</span>
              <h2>Measurement Units</h2>
            </div>
            <div class="card-content">
              <label class="form-label">Weather Units</label>
              <div class="theme-options">
                <button
                  type="button"
                  class="theme-btn"
                  [class.active]="preferences.measurementUnits === 'imperial'"
                  (click)="setUnits('imperial')">
                  <span class="theme-icon">&#8457;</span>
                  Imperial
                  <span class="unit-desc">(°F, mph)</span>
                </button>
                <button
                  type="button"
                  class="theme-btn"
                  [class.active]="preferences.measurementUnits === 'metric'"
                  (click)="setUnits('metric')">
                  <span class="theme-icon">&#8451;</span>
                  Metric
                  <span class="unit-desc">(°C, km/h)</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        <div class="save-section" *ngIf="preferences">
          <button type="button" (click)="savePreferences()" class="btn-save" [disabled]="saving">
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>

          <div class="message success" *ngIf="saveSuccess">
            Preferences saved successfully
          </div>
          <div class="message error" *ngIf="saveError">
            Failed to save preferences. Please try again.
          </div>
        </div>

        <ng-template #loading>
          <div class="loading-state">Loading preferences...</div>
        </ng-template>
      </main>
    </div>
  `,
  styles: [`
    .preferences-container {
      min-height: 100vh;
      background: var(--bg-gradient);
      color: var(--text-primary);
    }

    .navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2rem;
      background: var(--navbar-bg);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--navbar-border);
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .logo-icon {
      font-size: 1.5rem;
      color: var(--accent-primary);
    }

    .logo-text {
      font-size: 1.25rem;
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    .nav-link {
      color: var(--text-tertiary);
      text-decoration: none;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .nav-link:hover {
      color: var(--text-primary);
      background: var(--surface-hover);
    }

    .content {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 600;
      margin: 0 0 0.5rem;
      color: var(--text-primary);
    }

    .page-header p {
      color: var(--text-muted);
      margin: 0;
    }

    .settings-grid {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .settings-card {
      background: var(--surface-primary);
      backdrop-filter: blur(20px);
      border: 1px solid var(--surface-border);
      border-radius: 16px;
      padding: 1.5rem;
      transition: all 0.3s ease;
    }

    .settings-card:hover {
      border-color: var(--surface-border-hover);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--surface-border);
    }

    .card-icon {
      font-size: 1.25rem;
      color: var(--accent-primary);
    }

    .card-header h2 {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0;
    }

    .input-group {
      display: flex;
      gap: 0.75rem;
    }

    .form-input {
      flex: 1;
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      color: var(--text-primary);
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .form-input::placeholder {
      color: var(--text-faint);
    }

    .form-input:focus {
      outline: none;
      border-color: var(--input-focus-border);
      background: var(--surface-hover);
    }

    .btn-add {
      background: var(--accent-gradient);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-add:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-accent);
    }

    .teams-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1rem;
      min-height: 50px;
      padding: 1rem;
      background: var(--surface-primary);
      border-radius: 8px;
      border: 1px solid var(--surface-border);
    }

    .team-tag {
      background: var(--accent-gradient);
      color: white;
      padding: 0.5rem 0.75rem 0.5rem 1rem;
      border-radius: 20px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
    }

    .btn-remove {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      font-size: 0.7rem;
      cursor: pointer;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .btn-remove:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .empty-state {
      color: var(--text-faint);
      font-size: 0.9rem;
    }

    .toggle-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
    }

    .toggle-text {
      color: var(--text-secondary);
    }

    .toggle-switch {
      position: relative;
      width: 50px;
      height: 26px;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--input-border);
      border-radius: 26px;
      transition: 0.3s;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: 0.3s;
    }

    .toggle-switch input:checked + .toggle-slider {
      background: var(--accent-gradient);
    }

    .toggle-switch input:checked + .toggle-slider:before {
      transform: translateX(24px);
    }

    .form-label {
      display: block;
      color: var(--text-tertiary);
      font-size: 0.9rem;
      margin-bottom: 0.75rem;
    }

    .theme-options {
      display: flex;
      gap: 1rem;
    }

    .theme-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.25rem;
      background: var(--surface-primary);
      border: 1px solid var(--surface-border);
      border-radius: 12px;
      color: var(--text-tertiary);
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .theme-btn:hover {
      background: var(--surface-hover);
      border-color: var(--surface-border-hover);
    }

    .theme-btn.active {
      background: rgba(96, 165, 250, 0.1);
      border-color: var(--accent-primary);
      color: var(--text-primary);
    }

    .theme-icon {
      font-size: 1.5rem;
    }

    .unit-desc {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }

    .save-section {
      margin-top: 2rem;
      text-align: center;
    }

    .btn-save {
      background: linear-gradient(135deg, var(--success) 0%, #10b981 100%);
      color: white;
      border: none;
      padding: 0.875rem 2.5rem;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-save:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(52, 211, 153, 0.3);
    }

    .btn-save:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .message {
      margin-top: 1rem;
      padding: 0.875rem 1.25rem;
      border-radius: 8px;
      font-size: 0.9rem;
      display: inline-block;
    }

    .message.success {
      background: var(--success-bg);
      border: 1px solid var(--success-border);
      color: var(--success);
    }

    .message.error {
      background: var(--error-bg);
      border: 1px solid var(--error-border);
      color: var(--error);
    }

    .loading-state {
      text-align: center;
      color: var(--text-muted);
      padding: 3rem;
    }

    @media (max-width: 768px) {
      .navbar {
        padding: 1rem 1.5rem;
      }

      .content {
        padding: 1.5rem;
      }

      .page-header h1 {
        font-size: 1.5rem;
      }

      .input-group {
        flex-direction: column;
      }

      .btn-add {
        width: 100%;
      }

      .theme-options {
        gap: 0.75rem;
      }

      .theme-btn {
        padding: 1rem;
      }
    }

    @media (max-width: 480px) {
      .navbar {
        padding: 0.875rem 1rem;
      }

      .logo-text {
        display: none;
      }

      .content {
        padding: 1rem;
      }

      .settings-card {
        padding: 1.25rem;
        border-radius: 12px;
      }
    }
  `]
})
export class PreferencesComponent implements OnInit {
  preferences: UserPreferences | null = null;
  teamInput = '';
  saving = false;
  saveSuccess = false;
  saveError = false;

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private themeService: ThemeService
  ) { }

  ngOnInit() {
    this.loadPreferences();
  }

  loadPreferences() {
    this.http.get<UserPreferences>(`${this.apiUrl}/preferences`)
      .subscribe({
        next: (data) => {
          this.preferences = data;
          // Sync theme with ThemeService
          if (data.theme === 'light' || data.theme === 'dark') {
            this.themeService.setTheme(data.theme);
          }
        },
        error: (err) => {
          console.error('Failed to load preferences', err);
          this.preferences = {
            favoriteTeams: [],
            notifications: true,
            theme: this.themeService.theme(),
            measurementUnits: 'imperial'
          };
        }
      });
  }

  setTheme(theme: Theme) {
    if (this.preferences) {
      this.preferences.theme = theme;
      this.themeService.setTheme(theme);
    }
  }

  setUnits(units: 'metric' | 'imperial') {
    if (this.preferences) {
      this.preferences.measurementUnits = units;
    }
  }

  addTeam() {
    if (this.teamInput.trim() && this.preferences) {
      if (!this.preferences.favoriteTeams.includes(this.teamInput.trim())) {
        this.preferences.favoriteTeams.push(this.teamInput.trim());
        this.teamInput = '';
      }
    }
  }

  removeTeam(team: string) {
    if (this.preferences) {
      this.preferences.favoriteTeams = this.preferences.favoriteTeams.filter(t => t !== team);
    }
  }

  savePreferences() {
    if (!this.preferences) return;

    this.saving = true;
    this.saveSuccess = false;
    this.saveError = false;

    this.http.put(`${this.apiUrl}/preferences`, this.preferences)
      .subscribe({
        next: () => {
          this.saving = false;
          this.saveSuccess = true;
          setTimeout(() => this.saveSuccess = false, 3000);
        },
        error: (err) => {
          console.error('Failed to save preferences', err);
          this.saving = false;
          this.saveError = true;
          setTimeout(() => this.saveError = false, 3000);
        }
      });
  }
}
