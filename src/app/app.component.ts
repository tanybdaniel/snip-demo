import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { SnipService, LinkData } from './snip.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  urlInput = signal('');
  links = signal<LinkData[]>([]);
  loading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  constructor(private snipService: SnipService) {
    // Auto-load links when component initializes
    effect(() => {
      this.loadLinks();
    });
  }

  ngOnInit(): void {
    this.loadLinks();
  }

  isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  onSubmit(): void {
    const url = this.urlInput().trim();

    // Clear messages
    this.successMessage.set('');
    this.errorMessage.set('');

    // Validate URL
    if (!url) {
      this.errorMessage.set('Please enter a URL');
      return;
    }

    if (!this.isValidUrl(url)) {
      this.errorMessage.set('Invalid URL. Must start with http:// or https://');
      return;
    }

    // Submit to API
    this.loading.set(true);
    this.snipService.createLink(url).subscribe({
      next: (link) => {
        this.loading.set(false);
        this.successMessage.set(`Created: ${link.shortUrl}`);
        this.urlInput.set('');
        this.loadLinks();
      },
      error: (err) => {
        this.loading.set(false);
        const errorMsg = err.error?.error || err.statusText || 'Failed to create link';
        this.errorMessage.set(`Error: ${errorMsg}`);
      }
    });
  }

  private loadLinks(): void {
    this.snipService.getLinks().subscribe({
      next: (links) => {
        this.links.set(links);
      },
      error: (err) => {
        console.error('Failed to load links:', err);
      }
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.successMessage.set('Copied to clipboard!');
      setTimeout(() => this.successMessage.set(''), 2000);
    });
  }
}
