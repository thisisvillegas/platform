import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WorldThemeResponse {
  theme: string;
  mode: 'auto' | 'manual';
}

export interface WorldConfigResponse {
  activeTheme: string;
  themeMode: 'auto' | 'manual';
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class WorldApiService {
  private apiUrl = `${environment.apiUrl}/api/world`;

  constructor(private http: HttpClient) {}

  getActiveTheme(): Observable<WorldThemeResponse> {
    return this.http.get<WorldThemeResponse>(`${this.apiUrl}/theme`);
  }

  setTheme(theme: string, mode: 'auto' | 'manual'): Observable<WorldConfigResponse> {
    return this.http.put<WorldConfigResponse>(`${this.apiUrl}/theme`, { theme, mode });
  }
}
