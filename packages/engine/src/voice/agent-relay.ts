import { readVoiceMarker, type VoiceMarker } from '../feed';
import type { VoiceSay } from './call-types';
import { inPieces } from './pieces';
import type {
  PromptOutcome,
  SessionHappening,
  VoiceSessions,
} from './session-link';

// What the first Prompt of a call asks of the Agent, so the voice can tell progress from a result.
const voiceInstruction = [
  'A person is talking to you through a voice, and the voice reads your messages aloud.',
  'Begin every message with one mark:',
  '[STATUS] for progress the person may hear while you work,',
  '[COMPLETE] for the result, a question, or a blocker once you are done,',
  '[ANALYSIS] for notes that must stay silent.',
  'Keep spoken messages short and plain; do not read out code or tool output.',
].join('\n');

const outcomeText: Record<PromptOutcome, string> = {
  started: 'Sent to the Agent. It is working on it.',
  queued: 'The Agent is busy. This waits until its current work is done.',
};

const spokenMarks = new Set<VoiceMarker | null>(['[COMPLETE]']);

type Speak = (say: VoiceSay) => void;

// What the Agent said during the running Turn that the voice may still need at its end.
type TurnMemory = { resultSent: boolean; last: string | null };

const freshTurn = (): TurnMemory => ({ resultSent: false, last: null });

/*
 * One Voice call's go-between for its Session (ADR-0062): what the person asks for becomes a Prompt, and what the Agent
 * says, and when its Turn ends or fails, goes back to the voice. Tool output never does.
 */
export class AgentRelay {
  private instructed = false;
  private turn = freshTurn();

  public constructor(
    private readonly sessions: VoiceSessions,
    private readonly sessionId: string,
    private readonly speak: Speak,
  ) {}

  // The person asked for work: the Agent gets it, and the voice an answer at once.
  public async request(requestId: string, text: string): Promise<void> {
    const answer = await this.sessions
      .prompt(this.sessionId, this.promptText(text))
      .then(
        (outcome) => outcomeText[outcome],
        (error: Error) => `That could not be sent: ${error.message}`,
      );

    this.reply(requestId, answer);
  }

  public happened(happening: SessionHappening): void {
    if (happening.type === 'agent.message') this.agentSaid(happening.text);
    else if (happening.type === 'person.typed')
      this.personTyped(happening.text);
    else this.turnEnded(happening);
  }

  private promptText(request: string): string {
    if (this.instructed) return request;
    this.instructed = true;

    return `${voiceInstruction}\n\n${request}`;
  }

  private reply(requestId: string, text: string): void {
    this.speak({ kind: 'reply', requestId, text, delivery: 'speak' });
  }

  private tell(text: string, delivery: 'speak' | 'background'): void {
    for (const piece of inPieces(text))
      this.speak({ kind: 'tell', text: piece, delivery });
  }

  private agentSaid(text: string): void {
    const { marker, body } = readVoiceMarker(text);
    const result = spokenMarks.has(marker);

    this.tell(body, result ? 'speak' : 'background');
    this.remember(marker, body, result);
  }

  private remember(
    marker: VoiceMarker | null,
    body: string,
    result: boolean,
  ): void {
    if (result) this.turn = { resultSent: true, last: null };
    else if (marker !== '[ANALYSIS]') this.turn.last = body;
  }

  private personTyped(text: string): void {
    this.tell(`The person typed this to the Agent: ${text}`, 'background');
  }

  private turnEnded(
    ended: Extract<SessionHappening, { type: 'turn.ended' }>,
  ): void {
    const { resultSent, last } = this.turn;
    this.turn = freshTurn();

    if (!resultSent && last) this.tell(last, 'speak');
    this.tell(endingText(ended), endingDelivery(ended, told(resultSent, last)));
  }
}

const told = (resultSent: boolean, last: string | null): boolean =>
  resultSent || last !== null;

type Ended = Extract<SessionHappening, { type: 'turn.ended' }>;

const finishedCleanly = ({ stopReason, error }: Omit<Ended, 'type'>): boolean =>
  error === null && stopReason === 'end_turn';

function endingText({ stopReason, error }: Ended): string {
  if (error !== null) return `The Agent's Turn failed: ${error}`;

  return stopReason === 'end_turn'
    ? 'The Agent finished its Turn.'
    : `The Agent's Turn stopped: ${stopReason}.`;
}

// A Turn that failed, was stopped, or said nothing is spoken; one that ended with its result already told is background.
function endingDelivery(
  { stopReason, error }: Ended,
  toldResult: boolean,
): 'speak' | 'background' {
  return finishedCleanly({ stopReason, error }) && toldResult
    ? 'background'
    : 'speak';
}
