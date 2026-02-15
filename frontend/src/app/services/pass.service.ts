import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Pass {
  id: string;
  code: string;
  label: string;
  expiresAt: string;
  usedCount: number;
  createdAt: string;
  status: 'active' | 'expired';
}

export interface CreatePassRequest {
  label: string;
  expiresInDays: number;
}

export interface CreatePassResponse {
  code: string;
  label: string;
  expiresAt: string;
  usedCount: number;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class PassService {
  private apiUrl = `${environment.apiUrl}/api/passes`;

  constructor(private http: HttpClient) {}

  createPass(request: CreatePassRequest): Observable<CreatePassResponse> {
    return this.http.post<CreatePassResponse>(this.apiUrl, request);
  }

  getPasses(): Observable<Pass[]> {
    return this.http.get<Pass[]>(this.apiUrl);
  }

  revokePass(id: string): Observable<{ message: string; code: string }> {
    return this.http.delete<{ message: string; code: string }>(`${this.apiUrl}/${id}`);
  }
}
