import {
  readVoiceSections,
  withVoiceInstruction,
  type VoiceMessage,
} from '../feed';
import type { VoiceSay } from './call-types';
import { inPieces } from './pieces';
import type { VoiceDelivery } from './provider';
import { relayWords } from './relay-words';
import type {
  PromptOutcome,
  SessionHappening,
  VoiceSessions,
} from './session-link';
import {
  isPermissionHappening,
  WaitingPermission,
  type PermissionHappening,
} from './waiting-permission';

type Speak = (say: VoiceSay) => void;

// What the relay reports back to the call: what the voice should be told, and whether a Prompt it sent is still at work.
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
  // Prompts the call sent whose Turn has not ended, queued ones included; the Session says when each is done.
  private atWork = 0;
  private readonly permission = new WaitingPermission();

  public constructor(
    private readonly sessions: VoiceSessions,
    private readonly sessionId: string,
    private readonly reports: RelayReports,
  ) {}

  // The person asked for work: the Agent gets it, and the voice an answer at once.
  public async request(requestId: string, text: string): Promise<void> {
    // Counted before the Prompt is answered, so the call never idles between the request and its Turn.
    this.sentChanged(() => (this.atWork += 1));

    const answer = await this.sessions
      .prompt(this.sessionId, this.promptText(text))
      .then(
        (outcome: PromptOutcome) => this.sent(outcome),
        (error: Error) => {
          this.done();

          return relayWords.unsent(error.message);
        },
      );

    this.reply(requestId, this.permission.answering(answer));
  }

  public happened(happening: SessionHappening): void {
    if (happening.type === 'turn.ended') return this.turnEnded(happening);

    if (isPermissionHappening(happening))
      return this.permissionHeard(happening);
    this.said(happening);
  }

  private permissionHeard(happening: PermissionHappening): void {
    const announcement = this.permission.heard(happening);

    if (announcement !== null) this.tell(announcement, 'speak');
  }

  // What the voice is told of a Prompt that reached the Session; it stays at work until the Session says its Turn ended.
  private sent(outcome: PromptOutcome): string {
    void outcome.ended.then(() => this.done());

    if (outcome.status !== 'queued') return relayWords[outcome.status];

    return outcome.notSteered === null
      ? relayWords.queued
      : relayWords.notSteered(outcome.notSteered);
  }

  private done(): void {
    this.sentChanged(() => (this.atWork -= 1));
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
    return this.atWork > 0;
  }

  // Applies a change to what the call has running and reports it when it flips.
  private sentChanged(change: () => void): void {
    const before = this.running;
    change();

    if (before !== this.running) this.reports.turnsRunning(this.running);
  }

  private promptText(request: string): string {
    if (this.instructed) return request;
    this.instructed = true;

    return withVoiceInstruction(request);
  }

  private reply(requestId: string, text: string): void {
    this.reports.speak({ kind: 'reply', requestId, text, delivery: 'speak' });
  }

  private tell(text: string, delivery: VoiceDelivery): void {
    for (const piece of inPieces(text))
      this.reports.speak({ kind: 'tell', text: piece, delivery });
  }

  // Each section goes as its mark says: a result is spoken, progress and analysis are background.
  private agentSaid(text: string): void {
    for (const section of readVoiceSections(text)) {
      this.tell(
        section.body,
        section.kind === 'result' ? 'speak' : 'background',
      );
      this.remember(section);
    }
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
): VoiceDelivery {
  return finishedCleanly({ stopReason, error }) && toldResult
    ? 'background'
    : 'speak';
}
