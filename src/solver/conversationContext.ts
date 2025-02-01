export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class ConversationContext {
  openAiParentHistory: ChatMessage[] = [];
  deepSeekParentHistory: ChatMessage[] = [];

  sharedNegotiation: ChatMessage[] = [];

  constructor(public question: string) {}
}
