import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface NetworkInterface { name: string; ip: string; rx: number; tx: number; }
interface Process { name: string; pid: number; user: string; memPercent: number; memMB: number; tty: string; }
interface ServerStats {
  timestamp: string;
  system: { hostname: string; uptime: string; loadAverage: number[]; cpuTemp: number; };
  memory: { total: number; available: number; used: number; usedPercent: number; swap: { total: number; free: number; used: number; }; };
  disk: { total: string; used: string; available: string; usedPercent: number; };
  network: { interfaces: NetworkInterface[]; };
  processes: Process[];
  claudeSessions: number;
}
interface HistoryPoint { time: string; cpu: number; mem: number; temp: number; }

@Component({
  selector: 'app-server',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './server.component.html',
  styleUrls: ['./server.component.scss']
})
export class ServerComponent implements OnInit, OnDestroy {
  stats: ServerStats | null = null;
  error: string | null = null;
  loading = true;
  isPaused = false;
  lastUpdate = '';
  history: HistoryPoint[] = [];
  readonly MAX_HISTORY = 30;
  Math = Math; // Expose Math to template

  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_MS = 2000;
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadStats();
    this.startPolling();
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  ngOnDestroy() {
    this.stopPolling();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleVisibilityChange = () => {
    if (document.hidden) this.stopPolling();
    else if (!this.isPaused) { this.loadStats(); this.startPolling(); }
  };

  loadStats() {
    this.http.get<ServerStats>(`${this.apiUrl}/server/stats`).subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
        this.error = null;
        this.lastUpdate = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.history.push({ time: this.lastUpdate, cpu: data.system.loadAverage[0], mem: data.memory.usedPercent, temp: data.system.cpuTemp });
        if (this.history.length > this.MAX_HISTORY) this.history.shift();
      },
      error: () => { this.error = 'SIGNAL LOST'; this.loading = false; }
    });
  }

  startPolling() { if (!this.pollInterval) this.pollInterval = setInterval(() => this.loadStats(), this.POLL_MS); }
  stopPolling() { if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; } }
  togglePause() { this.isPaused = !this.isPaused; this.isPaused ? this.stopPolling() : (this.loadStats(), this.startPolling()); }

  // Big graph paths (300x80)
  getGraphPathBig(metric: 'cpu' | 'mem' | 'temp'): string {
    if (this.history.length < 2) return '';
    const maxVal = metric === 'cpu' ? 8 : metric === 'temp' ? 85 : 100;
    const w = 300, h = 80;
    return 'M' + this.history.map((pt, i) => {
      const x = (i / (this.MAX_HISTORY - 1)) * w;
      const v = metric === 'cpu' ? pt.cpu : metric === 'mem' ? pt.mem : pt.temp;
      const y = h - (Math.min(v, maxVal) / maxVal) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' L');
  }

  getGraphFillBig(metric: 'cpu' | 'mem' | 'temp'): string {
    const path = this.getGraphPathBig(metric);
    if (!path) return '';
    const lastX = ((this.history.length - 1) / (this.MAX_HISTORY - 1)) * 300;
    return `${path} L${lastX},80 L0,80 Z`;
  }

  formatBytes(kb: number): string {
    const b = kb * 1024;
    return b >= 1e9 ? (b/1e9).toFixed(1)+'G' : b >= 1e6 ? (b/1e6).toFixed(0)+'M' : (b/1e3).toFixed(0)+'K';
  }

  formatNetBytes(bytes: number): string {
    return bytes >= 1e9 ? (bytes/1e9).toFixed(1)+'G' : bytes >= 1e6 ? (bytes/1e6).toFixed(0)+'M' : (bytes/1e3).toFixed(0)+'K';
  }

  getStatusClass(val: number, t: [number, number]): string {
    return val < t[0] ? 'ok' : val < t[1] ? 'warn' : 'crit';
  }
}
