import { Injectable } from '@angular/core';
import { Observable, from, catchError, of } from 'rxjs';

export interface PassValidationResponse {
  valid: boolean;
  token?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PassValidationService {
  private readonly API_URL = '/api/passes/validate';

  validateCode(code: string): Observable<PassValidationResponse> {
    return from(
      fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      })
      .then(response => response.json())
      .then(data => {
        if (data.valid && data.token) {
          // Store JWT in localStorage
          localStorage.setItem('guest_token', data.token);
        }
        return data as PassValidationResponse;
      })
    ).pipe(
      catchError(error => {
        console.error('Pass validation error:', error);
        return of({
          valid: false,
          error: 'Network error. Please try again.'
        });
      })
    );
  }

  getStoredToken(): string | null {
    return localStorage.getItem('guest_token');
  }

  clearToken(): void {
    localStorage.removeItem('guest_token');
  }

  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  }
}
