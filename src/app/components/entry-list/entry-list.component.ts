import { Component, EventEmitter, Input, Output } from '@angular/core';
import { JournalEntry, MOOD_OPTIONS } from '../../models/journal-entry.model';

@Component({
  selector: 'app-entry-list',
  standalone: true,
  templateUrl: './entry-list.component.html',
  styleUrl: './entry-list.component.css',
})
export class EntryListComponent {
  @Input() entries: JournalEntry[] = [];
  @Input() showDate: boolean = true;
  @Output() edit = new EventEmitter<JournalEntry>();
  @Output() delete = new EventEmitter<string>();
  @Output() view = new EventEmitter<JournalEntry>();

  getMoodEmoji(mood: string): string {
    return MOOD_OPTIONS.find((m) => m.value === mood)?.emoji || '\u{1F610}';
  }

  getMoodLabel(mood: string): string {
    return MOOD_OPTIONS.find((m) => m.value === mood)?.label || 'Neutral';
  }

  formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  truncate(text: string, maxLen: number): string {
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  }
}
