import { Injectable, signal, computed } from '@angular/core';
import { JournalEntry, Mood } from '../models/journal-entry.model';

const STORAGE_KEY = 'journal_entries';

@Injectable({ providedIn: 'root' })
export class JournalService {
  private entriesSignal = signal<JournalEntry[]>(this.loadFromStorage());

  readonly entries = this.entriesSignal.asReadonly();

  readonly sortedEntries = computed(() =>
    [...this.entriesSignal()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  );

  private loadFromStorage(): JournalEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entriesSignal()));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }

  getEntriesForDate(date: string): JournalEntry[] {
    return this.entriesSignal().filter((e) => e.date === date);
  }

  getEntriesForMonth(year: number, month: number): JournalEntry[] {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return this.entriesSignal().filter((e) => e.date.startsWith(prefix));
  }

  getDaysWithEntriesForMonth(year: number, month: number): number[] {
    const entries = this.getEntriesForMonth(year, month);
    return [...new Set(entries.map((e) => parseInt(e.date.split('-')[2], 10)))];
  }

  getEntryById(id: string): JournalEntry | undefined {
    return this.entriesSignal().find((e) => e.id === id);
  }

  addEntry(data: {
    title: string;
    content: string;
    mood: Mood;
    tags: string[];
    date: string;
    time: string;
  }): JournalEntry {
    const now = new Date();
    const entry: JournalEntry = {
      id: this.generateId(),
      title: data.title,
      content: data.content,
      mood: data.mood,
      tags: data.tags,
      date: data.date,
      createdAt: `${data.date}T${data.time}`,
      updatedAt: now.toISOString(),
    };
    this.entriesSignal.update((entries) => [...entries, entry]);
    this.saveToStorage();
    return entry;
  }

  updateEntry(
    id: string,
    data: {
      title: string;
      content: string;
      mood: Mood;
      tags: string[];
      date: string;
      time: string;
    }
  ): JournalEntry | undefined {
    let updated: JournalEntry | undefined;
    this.entriesSignal.update((entries) =>
      entries.map((e) => {
        if (e.id === id) {
          updated = {
            ...e,
            title: data.title,
            content: data.content,
            mood: data.mood,
            tags: data.tags,
            date: data.date,
            createdAt: `${data.date}T${data.time}`,
            updatedAt: new Date().toISOString(),
          };
          return updated;
        }
        return e;
      })
    );
    this.saveToStorage();
    return updated;
  }

  deleteEntry(id: string): boolean {
    const before = this.entriesSignal().length;
    this.entriesSignal.update((entries) => entries.filter((e) => e.id !== id));
    const deleted = this.entriesSignal().length < before;
    if (deleted) this.saveToStorage();
    return deleted;
  }

  getUniqueTags(): string[] {
    const tags = new Set<string>();
    this.entriesSignal().forEach((e) => e.tags.forEach((t) => tags.add(t)));
    return [...tags].sort();
  }

  searchEntries(query: string): JournalEntry[] {
    const q = query.toLowerCase();
    return this.entriesSignal().filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  getEntriesForWeek(weekOffset: number = 0): JournalEntry[] {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() - weekOffset * 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startStr = this.formatDateKey(startOfWeek);
    const endStr = this.formatDateKey(endOfWeek);

    return this.entriesSignal()
      .filter((e) => e.date >= startStr && e.date <= endStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  getWeekRange(weekOffset: number = 0): { start: Date; end: Date; label: string } {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() - weekOffset * 7);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const label = `${start.toLocaleDateString('en-US', opts)} - ${end.toLocaleDateString('en-US', opts)}, ${end.getFullYear()}`;

    return { start, end, label };
  }

  getEntriesForMonthRelative(monthOffset: number = 0): JournalEntry[] {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    return this.getEntriesForMonth(target.getFullYear(), target.getMonth())
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  getMonthLabel(monthOffset: number = 0): string {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    return target.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  formatEntriesForLLM(entries: JournalEntry[]): string {
    if (entries.length === 0) return 'No entries found for this period.';

    return entries
      .map((e) => {
        const date = new Date(e.date + 'T00:00:00');
        const dateStr = date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        });
        const mood = e.mood.charAt(0).toUpperCase() + e.mood.slice(1);
        const tags = e.tags.length > 0 ? `Tags: ${e.tags.join(', ')}` : '';
        return `## ${dateStr} - ${e.title}\nMood: ${mood}\n${tags}\n${e.content}`;
      })
      .join('\n\n---\n\n');
  }

  private formatDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
