import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JournalService } from '../../services/journal.service';
import { WebllmService } from '../../services/webllm.service';

@Component({
  selector: 'app-smart-search',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './smart-search.component.html',
  styleUrl: './smart-search.component.css',
})
export class SmartSearchComponent {
  query = signal('');
  searchResult = signal('');
  isSearching = signal(false);
  error = signal('');
  recentSearches = signal<string[]>([]);

  constructor(
    private journalService: JournalService,
    public webllmService: WebllmService
  ) {
    this.loadRecentSearches();
  }

  get totalEntries(): number {
    return this.journalService.entries().length;
  }

  async search(text?: string): Promise<void> {
    const q = text || this.query().trim();
    if (!q || this.isSearching()) return;

    this.isSearching.set(true);
    this.error.set('');
    this.searchResult.set('');
    this.query.set(q);

    this.saveRecentSearch(q);

    try {
      const allEntries = this.journalService.sortedEntries();
      const entriesText = this.journalService.formatEntriesForLLM(allEntries.slice(0, 100));

      const result = await this.webllmService.smartSearch(q, entriesText);
      this.searchResult.set(result);
    } catch (e: any) {
      this.error.set(e?.message || 'Search failed. Please try again.');
    } finally {
      this.isSearching.set(false);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.search();
    }
  }

  clearSearch(): void {
    this.query.set('');
    this.searchResult.set('');
    this.error.set('');
  }

  renderMarkdown(text: string): string {
    return text
      .replace(/### (.*)/g, '<h3>$1</h3>')
      .replace(/## (.*)/g, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*)/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/gs, (match) => {
        if (!match.startsWith('<ul>')) return `<ul>${match}</ul>`;
        return match;
      })
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  private loadRecentSearches(): void {
    try {
      const data = localStorage.getItem('journal_recent_searches');
      if (data) this.recentSearches.set(JSON.parse(data));
    } catch {}
  }

  private saveRecentSearch(query: string): void {
    const searches = this.recentSearches()
      .filter((s) => s !== query)
      .slice(0, 9);
    searches.unshift(query);
    this.recentSearches.set(searches);
    localStorage.setItem('journal_recent_searches', JSON.stringify(searches));
  }

  removeRecentSearch(query: string): void {
    this.recentSearches.update((s) => s.filter((x) => x !== query));
    localStorage.setItem(
      'journal_recent_searches',
      JSON.stringify(this.recentSearches())
    );
  }
}
