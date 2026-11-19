import { relayWords } from './relay-words';
import type { VoiceSessions } from './session-link';

// "stop" alone, with at most a "please" before it and a few words after it that add no request of their own.
const stopRequest = /^(?:please )?stop(?: (?:it|that|now|please|stop))*$/;

// Lower case, with punctuation dropped and spaces collapsed, so "Stop!" and " stop, please." read the same.
const normalised = (words: string): string =>
  words
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .split(/\s+/)
    .join(' ');

// Whether the person's handed-over words ask only to stop the Agent's work (ADR-0064: saying "stop" cancels the Turn).
export const isStopRequest = (words: string): boolean =>
  stopRequest.test(normalised(words));

// Cancels the Session's running Turn as the Stop button does, and answers with what the voice is told of it.
export const stopWork = (
  sessions: VoiceSessions,
  sessionId: string,
): Promise<string> =>
  sessions.stop(sessionId).then(
    (stopped) => (stopped ? relayWords.stopping : relayWords.nothingToStop),
    (error: Error) => relayWords.unsent(error.message),
  );
