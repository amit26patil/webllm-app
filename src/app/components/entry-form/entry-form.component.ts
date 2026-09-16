import { Component, EventEmitter, Input, OnChanges, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JournalEntry, Mood, MOOD_OPTIONS } from '../../models/journal-entry.model';

@Component({
  selector: 'app-entry-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './entry-form.component.html',
  styleUrl: './entry-form.component.css',
})
export class EntryFormComponent implements OnChanges {
  @Input() entry: JournalEntry | null = null;
  @Input() defaultDate: string = '';
  @Output() save = new EventEmitter<{
    title: string;
    content: string;
    mood: Mood;
    tags: string[];
    date: string;
    time: string;
  }>();
  @Output() cancel = new EventEmitter<void>();

  title = signal('');
  content = signal('');
  mood = signal<Mood>('neutral');
  tagsInput = signal('');
  date = signal('');
  time = signal('');
  tags = signal<string[]>([]);

  moodOptions = MOOD_OPTIONS;
  isEditing = false;

  ngOnChanges(): void {
    if (this.entry) {
      this.isEditing = true;
      this.title.set(this.entry.title);
      this.content.set(this.entry.content);
      this.mood.set(this.entry.mood);
      this.tags.set([...this.entry.tags]);
      this.date.set(this.entry.date);
      const timePart = this.entry.createdAt.split('T')[1] || '12:00';
      this.time.set(timePart.substring(0, 5));
    } else {
      this.isEditing = false;
      this.title.set('');
      this.content.set('');
      this.mood.set('neutral');
      this.tags.set([]);
      this.tagsInput.set('');
      const now = new Date();
      this.date.set(
        this.defaultDate ||
          `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      );
      this.time.set(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
    }
  }

  addTag(): void {
    const tag = this.tagsInput().trim();
    if (tag && !this.tags().includes(tag)) {
      this.tags.update((t) => [...t, tag]);
      this.tagsInput.set('');
    }
  }

  removeTag(tag: string): void {
    this.tags.update((t) => t.filter((x) => x !== tag));
  }

  onTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addTag();
    }
  }

  onSubmit(): void {
    if (!this.title().trim() || !this.content().trim()) return;
    this.save.emit({
      title: this.title().trim(),
      content: this.content().trim(),
      mood: this.mood(),
      tags: this.tags(),
      date: this.date(),
      time: this.time(),
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }

  updateTitle(value: string): void {
    this.title.set(value);
  }

  updateContent(value: string): void {
    this.content.set(value);
  }

  updateTagsInput(value: string): void {
    this.tagsInput.set(value);
  }

  updateDate(value: string): void {
    this.date.set(value);
  }

  updateTime(value: string): void {
    this.time.set(value);
  }

  setMood(m: Mood): void {
    this.mood.set(m);
  }
}
