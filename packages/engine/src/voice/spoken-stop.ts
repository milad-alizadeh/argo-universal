import { relayWords } from './relay-words';
import type { VoiceSessions } from './session-link';

const stopVerbs = 'stop|cancel|halt';

// Words around a stop that add no request of their own: "OK, stop working now, please".
const leadIns = '(?:ok|okay|hey|please) ';

const trailers = `it|that|this|working|work|now|please|everything|${stopVerbs}`;

// A whole utterance that asks only to stop: a stop verb, with at most a few lead-in and trailing words that ask nothing else.
const stopRequest = new RegExp(
  `^(?:${leadIns})*(?:${stopVerbs})(?: (?:${trailers}))*$`,
  'u',
);

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
