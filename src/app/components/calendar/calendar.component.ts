import { Component, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { JournalService } from '../../services/journal.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css',
})
export class CalendarComponent {
  today = new Date();
  currentYear = signal(this.today.getFullYear());
  currentMonth = signal(this.today.getMonth());
  viewMode = signal<'year' | 'month'>('month');

  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  calendarDays = computed(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysWithEntries = this.journalService.getDaysWithEntriesForMonth(year, month);

    const days: { day: number; hasEntries: boolean; isToday: boolean; dateStr: string }[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ day: 0, hasEntries: false, isToday: false, dateStr: '' });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday =
        d === this.today.getDate() &&
        month === this.today.getMonth() &&
        year === this.today.getFullYear();
      days.push({
        day: d,
        hasEntries: daysWithEntries.includes(d),
        isToday,
        dateStr,
      });
    }

    return days;
  });

  yearsList = computed(() => {
    const current = this.today.getFullYear();
    const years: number[] = [];
    for (let y = current - 5; y <= current + 1; y++) {
      years.push(y);
    }
    return years;
  });

  constructor(
    private journalService: JournalService,
    private router: Router
  ) {}

  prevMonth(): void {
    if (this.currentMonth() === 0) {
      this.currentMonth.set(11);
      this.currentYear.update((y) => y - 1);
    } else {
      this.currentMonth.update((m) => m - 1);
    }
  }

  nextMonth(): void {
    if (this.currentMonth() === 11) {
      this.currentMonth.set(0);
      this.currentYear.update((y) => y + 1);
    } else {
      this.currentMonth.update((m) => m + 1);
    }
  }

  selectYear(year: number): void {
    this.currentYear.set(year);
    this.viewMode.set('month');
  }

  selectMonth(month: number): void {
    this.currentMonth.set(month);
    this.viewMode.set('month');
  }

  goToDay(dateStr: string): void {
    this.router.navigate(['/day', dateStr]);
  }

  goToday(): void {
    this.currentYear.set(this.today.getFullYear());
    this.currentMonth.set(this.today.getMonth());
    this.viewMode.set('month');
  }

  getMonthGrid(): { month: number; name: string }[] {
    return this.monthNames.map((name, i) => ({ month: i, name: name.substring(0, 3) }));
  }

  getEntryCountForDate(dateStr: string): number {
    return this.journalService.getEntriesForDate(dateStr).length;
  }
}
