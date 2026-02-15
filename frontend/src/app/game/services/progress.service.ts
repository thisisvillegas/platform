import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface VisitorProgress {
  collectibles: string[];
  achievements: string[];
  buildingsVisited: string[];
  npcsInteracted: string[];
  dialogueCount: number;
  timeSpent: number;
  lastPosition: { x: number; y: number };
  firstVisit: Date | null;
  lastVisit: Date | null;
}

export interface ProgressResponse {
  success: boolean;
  progress: VisitorProgress;
}

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  private apiUrl = `${environment.apiUrl}/api/world/progress`;

  constructor(private http: HttpClient) {}

  /**
   * Load visitor progress from backend.
   * Returns empty progress if no saved data or if not authenticated.
   */
  loadProgress(): Observable<ProgressResponse> {
    const token = this.getGuestToken();
    if (!token) {
      // No token, return empty progress
      return of({
        success: true,
        progress: this.getEmptyProgress()
      });
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<ProgressResponse>(this.apiUrl, { headers }).pipe(
      catchError(error => {
        console.error('Failed to load progress:', error);
        return of({
          success: false,
          progress: this.getEmptyProgress()
        });
      })
    );
  }

  /**
   * Save visitor progress to backend.
   * Requires guest authentication token.
   */
  saveProgress(progress: Partial<VisitorProgress>): Observable<ProgressResponse> {
    const token = this.getGuestToken();
    if (!token) {
      console.warn('Cannot save progress: no guest token');
      return of({ success: false, progress: this.getEmptyProgress() });
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    return this.http.post<ProgressResponse>(this.apiUrl, progress, { headers }).pipe(
      catchError(error => {
        console.error('Failed to save progress:', error);
        return of({ success: false, progress: this.getEmptyProgress() });
      })
    );
  }

  private getGuestToken(): string | null {
    return localStorage.getItem('guest_token');
  }

  private getEmptyProgress(): VisitorProgress {
    return {
      collectibles: [],
      achievements: [],
      buildingsVisited: [],
      npcsInteracted: [],
      dialogueCount: 0,
      timeSpent: 0,
      lastPosition: { x: 0, y: 0 },
      firstVisit: null,
      lastVisit: null
    };
  }
}
