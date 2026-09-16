import { Injectable, signal, computed } from '@angular/core';
import { CreateMLCEngine, MLCEngine, ChatCompletionRequest } from '@mlc-ai/web-llm';

export type LLMStatus = 'idle' | 'loading' | 'ready' | 'generating' | 'error';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const MODEL_ID = 'Phi-3.5-mini-instruct-q4f16_1-MLC';

@Injectable({ providedIn: 'root' })
export class WebllmService {
  private engine: MLCEngine | null = null;

  private statusSignal = signal<LLMStatus>('idle');
  private progressSignal = signal(0);
  private progressMessage = signal('');
  private errorSignal = signal('');

  readonly status = this.statusSignal.asReadonly();
  readonly progress = this.progressSignal.asReadonly();
  readonly progressMsg = this.progressMessage.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  readonly isReady = computed(() => this.statusSignal() === 'ready');
  readonly isLoading = computed(() => this.statusSignal() === 'loading');
  readonly isGenerating = computed(() => this.statusSignal() === 'generating');

  private async getEngine(): Promise<MLCEngine> {
    if (this.engine) return this.engine as MLCEngine;

    this.statusSignal.set('loading');
    this.progressSignal.set(0);
    this.progressMessage.set('Initializing WebLLM engine...');
    this.errorSignal.set('');

    try {
      const engine = await CreateMLCEngine(MODEL_ID);
      this.progressMessage.set('Downloading model (this may take a few minutes on first load)...');

      await engine.setInitProgressCallback((report: any) => {
        if (report.progress !== undefined) {
          this.progressSignal.set(Math.round(report.progress * 100));
        }
        if (report.text) {
          this.progressMessage.set(report.text);
        }
      });

      await engine.reload(MODEL_ID);
      this.engine = engine;
      this.statusSignal.set('ready');
      this.progressSignal.set(100);
      this.progressMessage.set('Model loaded successfully');
      return engine;
    } catch (e: any) {
      this.statusSignal.set('error');
      this.errorSignal.set(e?.message || 'Failed to load model');
      throw e;
    }
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const engine = await this.getEngine();
    this.statusSignal.set('generating');

    const messages: ChatCompletionRequest['messages'] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    try {
      const response = await engine.chat.completions.create({
        model: MODEL_ID,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      });

      const content = response.choices?.[0]?.message?.content || '';
      this.statusSignal.set('ready');
      return content;
    } catch (e: any) {
      this.statusSignal.set('ready');
      throw e;
    }
  }

  async *generateStream(
    prompt: string,
    systemPrompt?: string
  ): AsyncGenerator<string> {
    const engine = await this.getEngine();
    this.statusSignal.set('generating');

    const messages: ChatCompletionRequest['messages'] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    try {
      const stream = await engine.chat.completions.create({
        model: MODEL_ID,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: true,
      });

      let accumulated = '';
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (delta) {
          accumulated += delta;
          yield accumulated;
        }
      }

      this.statusSignal.set('ready');
    } catch (e: any) {
      this.statusSignal.set('ready');
      throw e;
    }
  }

  async summarizeEntries(
    entriesText: string,
    period: 'week' | 'month'
  ): Promise<string> {
    const periodLabel = period === 'week' ? 'weekly' : 'monthly';
    const systemPrompt = `You are a thoughtful journal analyst. Summarize the user's ${periodLabel} journal entries. 
Focus on:
- Key themes and recurring topics
- Emotional patterns and mood trends  
- Notable events or milestones
- Personal growth or challenges
- Actionable insights

Be concise but insightful. Use a warm, supportive tone. Format with clear sections using markdown.`;

    const prompt = `Here are my journal entries for the past ${periodLabel}:\n\n${entriesText}\n\nPlease provide a thoughtful ${periodLabel} summary of my thoughts and experiences.`;

    return this.generate(prompt, systemPrompt);
  }

  async chatWithContext(
    question: string,
    entriesText: string,
    history: ChatMessage[] = []
  ): Promise<string> {
    const systemPrompt = `You are a personal journal assistant. The user will ask you questions about their journal entries. 
Answer based ONLY on the provided journal entries. If the information isn't in the entries, say so.
Be helpful, empathetic, and insightful. Reference specific entries when relevant.`;

    const contextBlock = `Here are the relevant journal entries:\n\n${entriesText}\n\n---\n\nConversation so far:\n`;
    const historyText = history
      .slice(-10)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = historyText
      ? `${contextBlock}${historyText}\n\nUser: ${question}`
      : `${contextBlock}User: ${question}`;

    return this.generate(prompt, systemPrompt);
  }

  async smartSearch(
    query: string,
    entriesText: string
  ): Promise<string> {
    const systemPrompt = `You are a smart journal search assistant. The user provides a search query and journal entries. 
Your task:
1. Analyze the search query to understand the user's intent
2. Find the most relevant entries that match the query (even if the exact words don't match)
3. For each relevant entry, provide:
   - The date and title
   - Why it matches the query
   - A brief excerpt
4. Rank results by relevance
5. If nothing matches, suggest alternative search terms

Be precise and helpful. Format results clearly.`;

    const prompt = `Search query: "${query}"\n\nJournal entries:\n\n${entriesText}\n\nPlease find entries relevant to this search query and explain why each matches.`;

    return this.generate(prompt, systemPrompt);
  }

  resetEngine(): void {
    this.engine = null;
    this.statusSignal.set('idle');
    this.progressSignal.set(0);
    this.progressMessage.set('');
    this.errorSignal.set('');
  }
}
