import { Component, signal, computed, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { JournalService } from '../../services/journal.service';
import { JournalEntry, Mood } from '../../models/journal-entry.model';
import { CalendarComponent } from '../../components/calendar/calendar.component';
import { EntryFormComponent } from '../../components/entry-form/entry-form.component';
import { EntryListComponent } from '../../components/entry-list/entry-list.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CalendarComponent, EntryFormComponent, EntryListComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  showForm = signal(false);
  editingEntry = signal<JournalEntry | null>(null);
  searchQuery = signal('');
  showDeleteConfirm = signal(false);
  deletingId = signal<string | null>(null);

  recentEntries = computed(() => {
    const q = this.searchQuery();
    if (q.trim()) {
      return this.journalService.searchEntries(q);
    }
    return this.journalService.sortedEntries().slice(0, 10);
  });

  totalEntries = computed(() => this.journalService.entries().length);

  totalDays = computed(() => {
    const dates = new Set(this.journalService.entries().map((e) => e.date));
    return dates.size;
  });

  currentStreak = computed(() => {
    const entries = this.journalService.entries();
    if (entries.length === 0) return 0;
    const dates = [...new Set(entries.map((e) => e.date))].sort().reverse();
    const today = new Date();
    let streak = 0;
    let checkDate = new Date(today);

    for (const dateStr of dates) {
      const expected = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (dateStr === expected) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (dateStr < expected) {
        break;
      }
    }
    return streak;
  });

  constructor(
    private journalService: JournalService,
    private router: Router
  ) {}

  ngOnInit(): void {}

  openNewEntry(): void {
    this.editingEntry.set(null);
    this.showForm.set(true);
  }

  openEditEntry(entry: JournalEntry): void {
    this.editingEntry.set(entry);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingEntry.set(null);
  }

  saveEntry(data: {
    title: string;
    content: string;
    mood: Mood;
    tags: string[];
    date: string;
    time: string;
  }): void {
    if (this.editingEntry()) {
      this.journalService.updateEntry(this.editingEntry()!.id, data);
    } else {
      this.journalService.addEntry(data);
    }
    this.closeForm();
  }

  confirmDelete(id: string): void {
    this.deletingId.set(id);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.deletingId.set(null);
  }

  doDelete(): void {
    if (this.deletingId()) {
      this.journalService.deleteEntry(this.deletingId()!);
    }
    this.cancelDelete();
  }

  viewEntry(entry: JournalEntry): void {
    this.router.navigate(['/day', entry.date]);
  }

  updateSearch(value: string): void {
    this.searchQuery.set(value);
  }
}
