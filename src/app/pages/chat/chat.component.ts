import { Component, signal, computed, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JournalService } from '../../services/journal.service';
import { WebllmService, ChatMessage } from '../../services/webllm.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  userInput = signal('');
  messages = signal<ChatMessage[]>([]);
  isLoading = signal(false);
  private shouldScroll = false;

  suggestedQuestions = [
    'What were my happiest moments this month?',
    'What topics do I write about most often?',
    'How has my mood been trending lately?',
    'What are the main challenges I mentioned?',
    'Summarize my week in 3 bullet points',
  ];

  constructor(
    private journalService: JournalService,
    public webllmService: WebllmService
  ) {}

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  get totalEntries(): number {
    return this.journalService.entries().length;
  }

  async sendMessage(text?: string): Promise<void> {
    const query = text || this.userInput().trim();
    if (!query || this.isLoading()) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    this.messages.update((msgs) => [...msgs, userMsg]);
    this.userInput.set('');
    this.isLoading.set(true);
    this.shouldScroll = true;

    try {
      const allEntries = this.journalService.sortedEntries();
      const entriesText = this.journalService.formatEntriesForLLM(allEntries.slice(0, 50));

      const response = await this.webllmService.chatWithContext(
        query,
        entriesText,
        this.messages()
      );

      this.messages.update((msgs) => [
        ...msgs,
        { role: 'assistant', content: response, timestamp: Date.now() },
      ]);
    } catch (e: any) {
      this.messages.update((msgs) => [
        ...msgs,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${e?.message || 'Unknown error'}. Please try again.`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      this.isLoading.set(false);
      this.shouldScroll = true;
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    this.messages.set([]);
  }

  private scrollToBottom(): void {
    try {
      const el = this.scrollContainer?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch {}
  }

  formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
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

  escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }
}
