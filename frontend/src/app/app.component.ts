import { Component, inject, OnDestroy, OnInit, HostListener } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { ThemeService } from "./services/theme.service";
import { ServerOverlayService } from "./services/server-overlay.service";
import { environment } from "../environments/environment";
import { Subscription } from "rxjs";

interface ServerStats {
  system: { hostname: string; uptime: string; uptimeSeconds: number; loadAverage: number[]; cpuTemp: number; cpuFreq: number; kernel: string; processCount: number; };
  memory: { total: number; available: number; used: number; usedPercent: number; cached: number; swap: { total: number; free: number; used: number; }; };
  disk: { total: string; used: string; available: string; usedPercent: number; };
  network: { interfaces: { name: string; ip: string; rx: number; tx: number; rxRate: number; txRate: number; errors: number; drops: number; }[]; connections: number; };
  processes: { name: string; pid: number; cpuPercent: number; memPercent: number; memMB: number; }[];
  claudeSessions: number;
  services: number;
  pm2: { name: string; status: string; cpu: number; mem: number; uptime: number; restarts: number; }[];
}

interface HistoryPoint { cpu: number; mem: number; temp: number; }

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss"
})
export class AppComponent implements OnInit, OnDestroy {
  private themeService = inject(ThemeService);
  private http = inject(HttpClient);
  private serverOverlay = inject(ServerOverlayService);
  private sub: Subscription | null = null;

  showServerOverlay = false;
  stats: ServerStats | null = null;
  statsError = false;
  isPaused = false;
  lastUpdate = "";
  history: HistoryPoint[] = [];
  private readonly MAX_HISTORY = 25;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  @HostListener("document:keydown.escape")
  onEscapeKey() {
    if (this.showServerOverlay) {
      this.closeOverlay();
    }
  }

  ngOnInit() {
    this.sub = this.serverOverlay.open$.subscribe(() => this.openOverlay());
  }

  ngOnDestroy() { 
    this.stopPolling(); 
    this.sub?.unsubscribe();
    this.unlockBodyScroll();
  }

  openOverlay() {
    this.showServerOverlay = true;
    this.lockBodyScroll();
    this.loadStats();
    this.startPolling();
  }

  closeOverlay(event?: MouseEvent) {
    this.showServerOverlay = false;
    this.unlockBodyScroll();
    this.stopPolling();
  }

  private lockBodyScroll() {
    document.body.style.overflow = "hidden";
  }

  private unlockBodyScroll() {
    document.body.style.overflow = "";
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    this.isPaused ? this.stopPolling() : this.startPolling();
  }

  private loadStats() {
    this.http.get<ServerStats>(`${environment.apiUrl}/server/stats`).subscribe({
      next: (data) => {
        this.stats = data;
        this.statsError = false;
        this.lastUpdate = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
        this.history.push({ cpu: data.system.loadAverage[0], mem: data.memory.usedPercent, temp: data.system.cpuTemp });
        if (this.history.length > this.MAX_HISTORY) this.history.shift();
      },
      error: () => { this.statsError = true; }
    });
  }

  private startPolling() {
    if (this.pollInterval) return;
    this.loadStats();
    this.pollInterval = setInterval(() => this.loadStats(), 2000);
  }

  private stopPolling() {
    if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
  }

  getGraphPath(metric: "cpu" | "mem" | "temp"): string {
    if (this.history.length < 2) return "";
    const max = metric === "cpu" ? 8 : metric === "temp" ? 85 : 100;
    return "M" + this.history.map((h, i) => {
      const x = (i / (this.MAX_HISTORY - 1)) * 200;
      const v = metric === "cpu" ? h.cpu : metric === "mem" ? h.mem : h.temp;
      const y = 40 - (Math.min(v, max) / max) * 40;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" L");
  }

  getGraphFill(metric: "cpu" | "mem" | "temp"): string {
    const path = this.getGraphPath(metric);
    if (!path) return "";
    const lastX = ((this.history.length - 1) / (this.MAX_HISTORY - 1)) * 200;
    return `${path} L${lastX},40 L0,40 Z`;
  }

  formatKB(kb: number): string {
    const b = kb * 1024;
    return b >= 1e9 ? (b/1e9).toFixed(1)+"G" : (b/1e6).toFixed(0)+"M";
  }

  formatBytes(bytes: number): string {
    if (bytes >= 1e9) return (bytes/1e9).toFixed(1) + "G";
    if (bytes >= 1e6) return (bytes/1e6).toFixed(0) + "M";
    if (bytes >= 1e3) return (bytes/1e3).toFixed(0) + "K";
    return bytes + "B";
  }

  formatRate(bytesPerSec: number): string {
    if (bytesPerSec >= 1e6) return (bytesPerSec/1e6).toFixed(1) + "M";
    if (bytesPerSec >= 1e3) return (bytesPerSec/1e3).toFixed(0) + "K";
    return bytesPerSec.toFixed(0) + "B";
  }

  getProcessName(name: string): string {
    return name.split(" ")[0].split("/").pop() || name;
  }

  getStatus(val: number, w: number, c: number): string {
    return val < w ? "ok" : val < c ? "warn" : "crit";
  }
}
