import { Component, signal, computed, OnInit } from '@angular/core';
import { JournalService } from '../../services/journal.service';
import { WebllmService } from '../../services/webllm.service';
import { JournalEntry } from '../../models/journal-entry.model';

@Component({
  selector: 'app-summary',
  standalone: true,
  templateUrl: './summary.component.html',
  styleUrl: './summary.component.css',
})
export class SummaryComponent implements OnInit {
  viewMode = signal<'week' | 'month'>('week');
  weekOffset = signal(0);
  monthOffset = signal(0);
  summary = signal('');
  isGenerating = signal(false);
  error = signal('');

  entries = computed(() => {
    if (this.viewMode() === 'week') {
      return this.journalService.getEntriesForWeek(this.weekOffset());
    }
    return this.journalService.getEntriesForMonthRelative(this.monthOffset());
  });

  periodLabel = computed(() => {
    if (this.viewMode() === 'week') {
      return this.journalService.getWeekRange(this.weekOffset()).label;
    }
    return this.journalService.getMonthLabel(this.monthOffset());
  });

  entryCount = computed(() => this.entries().length);

  moodSummary = computed(() => {
    const e = this.entries();
    if (e.length === 0) return null;
    const moodCounts: Record<string, number> = {};
    e.forEach((entry) => {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    });
    const dominant = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
    return dominant[0];
  });

  topTags = computed(() => {
    const tagCounts: Record<string, number> = {};
    this.entries().forEach((e) =>
      e.tags.forEach((t) => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      })
    );
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));
  });

  canGoBack = computed(() => {
    if (this.viewMode() === 'week') return this.weekOffset() < 20;
    return this.monthOffset() < 12;
  });

  constructor(
    private journalService: JournalService,
    public webllmService: WebllmService
  ) {}

  ngOnInit(): void {}

  setView(mode: 'week' | 'month'): void {
    this.viewMode.set(mode);
    this.summary.set('');
    this.error.set('');
  }

  prevPeriod(): void {
    if (this.viewMode() === 'week') {
      this.weekOffset.update((o) => o + 1);
    } else {
      this.monthOffset.update((o) => o + 1);
    }
    this.summary.set('');
    this.error.set('');
  }

  nextPeriod(): void {
    if (this.viewMode() === 'week') {
      this.weekOffset.update((o) => Math.max(0, o - 1));
    } else {
      this.monthOffset.update((o) => Math.max(0, o - 1));
    }
    this.summary.set('');
    this.error.set('');
  }

  async generateSummary(): Promise<void> {
    if (this.entries().length === 0) {
      this.error.set('No entries found for this period. Add some journal entries first!');
      return;
    }

    this.isGenerating.set(true);
    this.error.set('');
    this.summary.set('');

    try {
      const entriesText = this.journalService.formatEntriesForLLM(this.entries());
      const result = await this.webllmService.summarizeEntries(
        entriesText,
        this.viewMode()
      );
      this.summary.set(result);
    } catch (e: any) {
      this.error.set(e?.message || 'Failed to generate summary');
    } finally {
      this.isGenerating.set(false);
    }
  }

  getMoodEmoji(mood: string): string {
    const map: Record<string, string> = {
      great: '\u{1F604}',
      good: '\u{1F642}',
      neutral: '\u{1F610}',
      bad: '\u{1F641}',
      terrible: '\u{1F622}',
    };
    return map[mood] || '\u{1F610}';
  }

  renderMarkdown(text: string): string {
    return text
      .replace(/### (.*)/g, '<h3>$1</h3>')
      .replace(/## (.*)/g, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }
}
