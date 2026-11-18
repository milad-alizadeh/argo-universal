import { readVoiceMarker, type VoiceMarker } from '../feed';
import type { VoiceSay } from './call-types';
import { inPieces } from './pieces';
import { relayWords } from './relay-words';
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
  'End the call by running the Argo Operation voice.hangUp, but only when the person clearly says they are done with the call, such as goodbye or hang up.',
  'Do not end it when the person asks you to stop work, pause or wait: that is not the end of the call.',
].join('\n');

const spokenMarks = new Set<VoiceMarker | null>(['[COMPLETE]']);

type Speak = (say: VoiceSay) => void;

type TurnsRunning = (running: boolean) => void;

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
  // Prompts the call sent whose Turn has not ended.
  private sent = 0;

  public constructor(
    private readonly sessions: VoiceSessions,
    private readonly sessionId: string,
    private readonly speak: Speak,
    private readonly turnsRunning: TurnsRunning,
  ) {}

  // The person asked for work: the Agent gets it, and the voice an answer at once.
  public async request(requestId: string, text: string): Promise<void> {
    // Counted before the Prompt settles: a quick Turn may end before the send is answered.
    this.sentChanged(1);
    const answer = await this.sessions
      .prompt(this.sessionId, this.promptText(text))
      .then(
        (outcome: PromptOutcome) => relayWords[outcome],
        (error: Error) => {
          this.sentChanged(-1);

          return relayWords.unsent(error.message);
        },
      );

    this.reply(requestId, answer);
  }

  public happened(happening: SessionHappening): void {
    if (happening.type === 'agent.message') this.agentSaid(happening.text);
    else if (happening.type === 'person.typed')
      this.personTyped(happening.text);
    else this.turnEnded(happening);
  }

  private sentChanged(by: number): void {
    const before = this.sent > 0;
    this.sent = Math.max(0, this.sent + by);

    if (before !== this.sent > 0) this.turnsRunning(this.sent > 0);
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
    this.tell(relayWords.typed(text), 'background');
  }

  private turnEnded(
    ended: Extract<SessionHappening, { type: 'turn.ended' }>,
  ): void {
    const { resultSent, last } = this.turn;
    this.turn = freshTurn();
    this.sentChanged(-1);

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
  if (error !== null) return relayWords.failed(error);

  return stopReason === 'end_turn'
    ? relayWords.finished
    : relayWords.stopped(stopReason);
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
