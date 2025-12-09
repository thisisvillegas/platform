import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'app-theme';

  // Using Angular signals for reactive state
  theme = signal<Theme>(this.getStoredTheme());

  constructor() {
    // Apply theme whenever it changes
    effect(() => {
      this.applyTheme(this.theme());
    });

    // Apply initial theme
    this.applyTheme(this.theme());
  }

  private getStoredTheme(): Theme {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(this.THEME_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    }
    return 'dark'; // Default theme
  }

  setTheme(theme: Theme) {
    this.theme.set(theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.THEME_KEY, theme);
    }
  }

  private applyTheme(theme: Theme) {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      document.body.setAttribute('data-theme', theme);
    }
  }

  toggleTheme() {
    const newTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }
}
