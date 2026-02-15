import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PassService, Pass, CreatePassRequest } from '../../../services/pass.service';

@Component({
  selector: 'app-pass-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pass-manager.component.html',
  styleUrl: './pass-manager.component.scss'
})
export class PassManagerComponent implements OnInit {
  passes: Pass[] = [];
  loading = false;
  error: string | null = null;

  // Create form
  newPassLabel = '';
  newPassExpiry = 7; // default 7 days
  creating = false;

  // Revoke confirmation
  confirmingRevoke: string | null = null;

  constructor(private passService: PassService) {}

  ngOnInit(): void {
    this.loadPasses();
  }

  loadPasses(): void {
    this.loading = true;
    this.error = null;

    this.passService.getPasses().subscribe({
      next: (passes) => {
        this.passes = passes;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load passes';
        console.error('Error loading passes:', err);
        this.loading = false;
      }
    });
  }

  createPass(): void {
    if (!this.newPassLabel.trim()) {
      this.error = 'Label is required';
      return;
    }

    if (this.newPassExpiry < 1) {
      this.error = 'Expiry must be at least 1 day';
      return;
    }

    this.creating = true;
    this.error = null;

    const request: CreatePassRequest = {
      label: this.newPassLabel.trim(),
      expiresInDays: this.newPassExpiry
    };

    this.passService.createPass(request).subscribe({
      next: (response) => {
        // Reload passes to show new one
        this.loadPasses();

        // Reset form
        this.newPassLabel = '';
        this.newPassExpiry = 7;
        this.creating = false;

        // Auto-copy code to clipboard
        this.copyToClipboard(response.code);
      },
      error: (err) => {
        this.error = 'Failed to create pass';
        console.error('Error creating pass:', err);
        this.creating = false;
      }
    });
  }

  copyToClipboard(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      // Could show a toast notification here
      console.log('Code copied to clipboard:', code);
    });
  }

  confirmRevoke(passId: string): void {
    this.confirmingRevoke = passId;
  }

  cancelRevoke(): void {
    this.confirmingRevoke = null;
  }

  revokePass(passId: string): void {
    this.passService.revokePass(passId).subscribe({
      next: () => {
        this.confirmingRevoke = null;
        this.loadPasses(); // Reload to remove revoked pass
      },
      error: (err) => {
        this.error = 'Failed to revoke pass';
        console.error('Error revoking pass:', err);
        this.confirmingRevoke = null;
      }
    });
  }

  getStatusClass(status: string): string {
    return status === 'active' ? 'status-active' : 'status-expired';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
}
