import { Component, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { JournalService } from '../../services/journal.service';
import { JournalEntry, Mood } from '../../models/journal-entry.model';
import { EntryFormComponent } from '../../components/entry-form/entry-form.component';
import { EntryListComponent } from '../../components/entry-list/entry-list.component';

@Component({
  selector: 'app-day-view',
  standalone: true,
  imports: [EntryFormComponent, EntryListComponent],
  templateUrl: './day-view.component.html',
  styleUrl: './day-view.component.css',
})
export class DayViewComponent implements OnInit {
  date = signal('');
  entries = signal<JournalEntry[]>([]);
  showForm = signal(false);
  editingEntry = signal<JournalEntry | null>(null);
  showDeleteConfirm = signal(false);
  deletingId = signal<string | null>(null);

  formattedDate = computed(() => {
    const d = new Date(this.date() + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  isToday = computed(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return this.date() === today;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private journalService: JournalService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.date.set(params['date']);
      this.loadEntries();
    });
  }

  loadEntries(): void {
    this.entries.set(this.journalService.getEntriesForDate(this.date()));
  }

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
    this.loadEntries();
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
      this.loadEntries();
    }
    this.cancelDelete();
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  prevDay(): void {
    const d = new Date(this.date() + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    const newDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.router.navigate(['/day', newDate]);
  }

  nextDay(): void {
    const d = new Date(this.date() + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const newDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.router.navigate(['/day', newDate]);
  }
}
