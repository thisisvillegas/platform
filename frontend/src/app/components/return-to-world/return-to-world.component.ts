import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { WorldNavigationService } from '../../game/services/world-navigation.service';

/** Routes where the Return to World button should NOT appear. */
const HIDDEN_ROUTES = ['/world', '/login', '/door', '/callback'];

@Component({
  selector: 'app-return-to-world',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      *ngIf="visible"
      class="return-btn"
      (click)="returnToWorld()"
      title="Return to the game world"
    >
      &#9664; Return to World
    </button>
  `,
  styles: [`
    .return-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      padding: 10px 18px;
      background: rgba(0, 20, 30, 0.9);
      color: #00ffcc;
      border: 1px solid #00ffcc44;
      font-family: monospace;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
      letter-spacing: 0.5px;
    }
    .return-btn:hover {
      background: rgba(0, 40, 60, 0.95);
      border-color: #00ffcc;
      transform: scale(1.05);
      box-shadow: 0 0 12px rgba(0, 255, 204, 0.3);
    }
    @media (max-width: 600px) {
      .return-btn {
        bottom: 12px;
        right: 12px;
        font-size: 11px;
        padding: 8px 14px;
      }
    }
  `]
})
export class ReturnToWorldComponent implements OnInit, OnDestroy {
  visible = false;
  private routerSub?: Subscription;

  constructor(
    private router: Router,
    private worldNav: WorldNavigationService
  ) {}

  ngOnInit(): void {
    this.checkVisibility(this.router.url);
    this.routerSub = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe(e => this.checkVisibility(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  returnToWorld(): void {
    this.worldNav.returnToWorld();
  }

  private checkVisibility(url: string): void {
    const isHidden = HIDDEN_ROUTES.some(r => url.startsWith(r));
    this.visible = !isHidden && this.worldNav.hasWorldSession();
  }
}
