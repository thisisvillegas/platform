import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorldApiService } from '../../../services/world-api.service';

@Component({
  selector: 'app-world-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './world-manager.component.html',
  styleUrl: './world-manager.component.scss'
})
export class WorldManagerComponent implements OnInit {
  loading = false;
  error: string | null = null;
  success: string | null = null;

  currentTheme = 'default';
  currentMode: 'auto' | 'manual' = 'auto';

  selectedTheme = 'default';
  selectedMode: 'auto' | 'manual' = 'auto';

  themes = [
    { id: 'default', name: 'Day', icon: '☀️', color: '#87CEEB' },
    { id: 'night', name: 'Night', icon: '🌙', color: '#1a1a3d' },
    { id: 'valentine', name: 'Valentine\'s Day', icon: '💝', color: '#ff69b4' },
    { id: 'christmas', name: 'Christmas', icon: '🎄', color: '#e6f7ff' },
    { id: 'autumn', name: 'Autumn', icon: '🍂', color: '#ff8c00' },
    { id: 'halloween', name: 'Halloween', icon: '🎃', color: '#4b0082' }
  ];

  constructor(private worldApi: WorldApiService) {}

  ngOnInit(): void {
    this.loadCurrentTheme();
  }

  loadCurrentTheme(): void {
    this.loading = true;
    this.error = null;

    this.worldApi.getActiveTheme().subscribe({
      next: (response) => {
        this.currentTheme = response.theme;
        this.currentMode = response.mode;
        this.selectedTheme = response.theme;
        this.selectedMode = response.mode;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load current theme';
        console.error('Error loading theme:', err);
        this.loading = false;
      }
    });
  }

  saveTheme(): void {
    this.loading = true;
    this.error = null;
    this.success = null;

    this.worldApi.setTheme(this.selectedTheme, this.selectedMode).subscribe({
      next: (response) => {
        this.currentTheme = response.activeTheme;
        this.currentMode = response.themeMode;
        this.success = 'Theme updated successfully!';
        this.loading = false;

        // Clear success message after 3 seconds
        setTimeout(() => {
          this.success = null;
        }, 3000);
      },
      error: (err) => {
        this.error = 'Failed to update theme';
        console.error('Error updating theme:', err);
        this.loading = false;
      }
    });
  }

  getThemeInfo(themeId: string) {
    return this.themes.find(t => t.id === themeId);
  }
}
