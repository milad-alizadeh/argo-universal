import {
  conversationHistoryCharacters,
  readConversationHistory,
  type ConversationHistorySources,
} from '../feed';

// What the voice is told before it speaks.
export function briefingOf(
  sources: ConversationHistorySources,
  session: { id: string; title: string; folder: string },
): string {
  const header = `Session: ${session.title}\nWorking folder: ${session.folder}`;

  const history = readConversationHistory(sources, session.id, {
    room: conversationHistoryCharacters - header.length - 1,
  });

  return history ? `${header}\n${history}` : header;
}
