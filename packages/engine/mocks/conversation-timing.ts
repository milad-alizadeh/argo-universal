import type { ConversationWork } from './conversation-work';

export const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const statusOf = (
  work: ConversationWork,
): ReturnType<ConversationWork['host']['caller']['conversation']['status']> =>
  work.host.caller.conversation.status();
