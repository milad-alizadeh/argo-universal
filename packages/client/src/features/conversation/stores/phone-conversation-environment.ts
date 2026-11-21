import type { ConversationEnvironment } from '../types/conversation-environment';

// SPIKE (latency on a phone): a page carries a call through the browser's own pieces, so it has no phone environment.
export const phoneConversationEnvironment: ConversationEnvironment | null =
  null;

// The speaker or headphones the call plays on, for the latency panel; a page does not know it.
export const phoneAudioRoute = (): string | undefined => undefined;
