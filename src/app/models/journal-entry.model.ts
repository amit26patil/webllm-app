export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: Mood;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  date: string; // YYYY-MM-DD
}

export type Mood = 'great' | 'good' | 'neutral' | 'bad' | 'terrible';

export interface DayEntries {
  date: string;
  entries: JournalEntry[];
}

export interface MonthData {
  year: number;
  month: number;
  daysWithEntries: number[];
}

export const MOOD_OPTIONS: { value: Mood; label: string; emoji: string }[] = [
  { value: 'great', label: 'Great', emoji: '\u{1F604}' },
  { value: 'good', label: 'Good', emoji: '\u{1F642}' },
  { value: 'neutral', label: 'Neutral', emoji: '\u{1F610}' },
  { value: 'bad', label: 'Bad', emoji: '\u{1F641}' },
  { value: 'terrible', label: 'Terrible', emoji: '\u{1F622}' },
];
