import { relayWords } from './relay-words';
import type { SessionHappening } from './session-link';

type Told = Extract<
  SessionHappening,
  {
    type:
      | 'elicitation.waiting'
      | 'started.ended'
      | 'started.waiting'
      | 'agent.ended';
  }
>;

type Of<Type extends Told['type']> = Extract<Told, { type: Type }>;

const cleanStop = 'end_turn';

function startedEnding({
  title,
  last,
  stopReason,
  error,
}: Of<'started.ended'>): string {
  if (error !== null) return relayWords.startedFailed(title, error);

  return stopReason === cleanStop
    ? relayWords.startedFinished(title, last)
    : relayWords.startedStopped(title, stopReason);
}

const startedWaiting = ({
  title,
  request,
  what,
}: Of<'started.waiting'>): string =>
  request === 'permission'
    ? relayWords.startedWaitingPermission(title, what)
    : relayWords.startedAsking(title, what);

const agentEnding = ({ title, stopReason }: Of<'agent.ended'>): string =>
  stopReason === null || stopReason === cleanStop
    ? relayWords.agentFinished(title)
    : relayWords.agentStopped(title, stopReason);

const toldTypes = new Set<string>([
  'elicitation.waiting',
  'started.ended',
  'started.waiting',
  'agent.ended',
] satisfies Told['type'][]);

// A happening the voice says aloud as it is, with no Turn of the call's own to wait for.
export const isTold = (happening: SessionHappening): happening is Told =>
  toldTypes.has(happening.type);

const startedSpeech = (
  happening: Of<'started.ended' | 'started.waiting'>,
): string =>
  happening.type === 'started.ended'
    ? startedEnding(happening)
    : startedWaiting(happening);

// What the voice says of a question its Session asks, or of a Session or Agent its Session started (ADR-0064).
export function speechOf(happening: Told): string {
  if (happening.type === 'elicitation.waiting')
    return relayWords.elicitationWaiting(happening.message);

  return happening.type === 'agent.ended'
    ? agentEnding(happening)
    : startedSpeech(happening);
}
