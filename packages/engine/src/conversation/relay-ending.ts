import type { VoiceDelivery } from './provider';
import { relayWords } from './relay-words';
import type { SessionHappening } from './session-link';

// What the voice is told when a Turn ends, and whether it says it aloud.

export const told = (resultSent: boolean, last: string | null): boolean =>
  resultSent || last !== null;

export type Ended = Extract<SessionHappening, { type: 'turn.ended' }>;

const finishedCleanly = ({
  stopReason,
  error,
}: Pick<Ended, 'stopReason' | 'error'>): boolean =>
  error === null && stopReason === 'end_turn';

export function endingText({ stopReason, error }: Ended): string {
  if (error !== null) return relayWords.failed(error);

  return stopReason === 'end_turn'
    ? relayWords.finished
    : relayWords.stopped(stopReason);
}

// A Turn that failed, was stopped, or said nothing is spoken; one that ended with its result already told is background.
export function endingDelivery(
  ended: Ended,
  toldResult: boolean,
): VoiceDelivery {
  return finishedCleanly(ended) && toldResult ? 'background' : 'speak';
}
