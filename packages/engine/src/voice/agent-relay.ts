import { readVoiceMessage, voiceInstruction, type VoiceMessage } from '../feed';
import type { VoiceSay } from './call-types';
import { inPieces } from './pieces';
import { relayWords } from './relay-words';
import type {
  PromptOutcome,
  SessionHappening,
  VoiceSessions,
} from './session-link';

type Speak = (say: VoiceSay) => void;

// What the relay reports back to the call: what the voice should be told, and whether a Turn it started is running.
export interface RelayReports {
  speak: Speak;
  turnsRunning: (running: boolean) => void;
}

// What the Agent said during the running Turn that the voice may still need at its end.
type TurnMemory = { resultSent: boolean; last: string | null };

const freshTurn = (): TurnMemory => ({ resultSent: false, last: null });

/*
 * One Voice call's go-between for its Session (ADR-0063): what the person asks for becomes a Prompt, and what the Agent
 * says, and when its Turn ends or fails, goes back to the voice. Tool output never does.
 */
export class AgentRelay {
  private instructed = false;
  private turn = freshTurn();
  // Prompts the call sent that have not reached the Feed yet.
  private unseen = 0;
  // The Turns the call's Prompts are in, until each ends; a Turn the person typed is never in it.
  private readonly turns = new Set<string | null>();

  public constructor(
    private readonly sessions: VoiceSessions,
    private readonly sessionId: string,
    private readonly reports: RelayReports,
  ) {}

  // The person asked for work: the Agent gets it, and the voice an answer at once.
  public async request(requestId: string, text: string): Promise<void> {
    // Counted before the Prompt settles: a quick Turn may end before the send is answered.
    this.sentChanged(() => (this.unseen += 1));

    const answer = await this.sessions
      .prompt(this.sessionId, this.promptText(text))
      .then(
        (outcome: PromptOutcome) => relayWords[outcome],
        (error: Error) => {
          this.sentChanged(() => (this.unseen -= 1));

          return relayWords.unsent(error.message);
        },
      );

    this.reply(requestId, answer);
  }

  public happened(happening: SessionHappening): void {
    if (happening.type === 'turn.ended') this.turnEnded(happening);
    else if (happening.type === 'voice.prompted')
      this.prompted(happening.turnId);
    else this.said(happening);
  }

  private said(
    happening: Extract<
      SessionHappening,
      { type: 'agent.message' | 'person.typed' }
    >,
  ): void {
    if (happening.type === 'agent.message') this.agentSaid(happening.text);
    else this.personTyped(happening.text);
  }

  private get running(): boolean {
    return this.unseen > 0 || this.turns.size > 0;
  }

  // Applies a change to what the call has running and reports it when it flips.
  private sentChanged(change: () => void): void {
    const before = this.running;
    change();

    if (before !== this.running) this.reports.turnsRunning(this.running);
  }

  private prompted(turnId: string | null): void {
    this.sentChanged(() => {
      this.unseen = Math.max(0, this.unseen - 1);
      this.turns.add(turnId);
    });
  }

  private promptText(request: string): string {
    if (this.instructed) return request;
    this.instructed = true;

    return `${voiceInstruction}\n\n${request}`;
  }

  private reply(requestId: string, text: string): void {
    this.reports.speak({ kind: 'reply', requestId, text, delivery: 'speak' });
  }

  private tell(text: string, delivery: 'speak' | 'background'): void {
    for (const piece of inPieces(text))
      this.reports.speak({ kind: 'tell', text: piece, delivery });
  }

  private agentSaid(text: string): void {
    const message = readVoiceMessage(text);

    this.tell(message.body, message.kind === 'result' ? 'speak' : 'background');
    this.remember(message);
  }

  private remember({ kind, body }: VoiceMessage): void {
    if (kind === 'result') this.turn = { resultSent: true, last: null };
    else if (kind === 'progress') this.turn.last = body;
  }

  private personTyped(text: string): void {
    this.tell(relayWords.typed(text), 'background');
  }

  private turnEnded(
    ended: Extract<SessionHappening, { type: 'turn.ended' }>,
  ): void {
    const { resultSent, last } = this.turn;
    this.turn = freshTurn();
    this.sentChanged(() => this.turns.delete(ended.turnId));

    if (!resultSent && last) this.tell(last, 'speak');
    this.tell(endingText(ended), endingDelivery(ended, told(resultSent, last)));
  }
}

const told = (resultSent: boolean, last: string | null): boolean =>
  resultSent || last !== null;

type Ended = Extract<SessionHappening, { type: 'turn.ended' }>;

const finishedCleanly = ({
  stopReason,
  error,
}: Pick<Ended, 'stopReason' | 'error'>): boolean =>
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
