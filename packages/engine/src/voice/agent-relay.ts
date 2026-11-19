import {
  readVoiceSections,
  withVoiceInstruction,
  type VoiceMessage,
} from '../feed';
import type { RelayCall, VoiceSay } from './call-types';
import { inPieces } from './pieces';
import type { VoiceDelivery } from './provider';
import { endingDelivery, endingText, told, type Ended } from './relay-ending';
import { relayWords } from './relay-words';
import type {
  PromptOutcome,
  SessionHappening,
  VoiceSessions,
} from './session-link';
import { isStopRequest, stopWork } from './spoken-stop';
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
 * One Voice call's go-between for its Session (ADR-0064): what the person asks for becomes a Prompt, and what the Agent
 * says, and when its Turn ends or fails, goes back to the voice. Tool output never does.
 */
export class AgentRelay {
  private instructed = false;
  private turn = freshTurn();
  // Requests not yet answered, and Prompts the call sent whose Turn started and has not ended; a queued one counts from its Turn's start.
  private atWork = 0;
  private readonly permission = new WaitingPermission();

  public constructor(
    private readonly sessions: VoiceSessions,
    private readonly call: RelayCall,
    private readonly reports: RelayReports,
  ) {}

  // The person asked for work, or said "stop": the Agent gets it or its Turn is cancelled, and the voice an answer at once.
  public async request(requestId: string, text: string): Promise<void> {
    const answer = isStopRequest(text)
      ? await stopWork(this.sessions, this.call.sessionId)
      : this.permission.answering(await this.work(text));

    this.reply(requestId, answer);
  }

  // Sends the Agent a Prompt and answers with what the voice is told of where it landed.
  private work(text: string): Promise<string> {
    // Counted before the Prompt is answered, so the call never idles between the request and its Turn.
    this.sentChanged(() => (this.atWork += 1));

    return this.sessions
      .prompt(this.call.sessionId, this.promptText(text))
      .then(
        (outcome: PromptOutcome) => this.sent(outcome),
        (error: Error) => {
          this.done();

          return relayWords.unsent(error.message);
        },
      );
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

  // What the voice is told of a Prompt that reached the Session; a queued one waits for its Turn before it counts.
  private sent(outcome: PromptOutcome): string {
    if (outcome.status !== 'queued') {
      this.working(outcome);

      return relayWords[outcome.status];
    }

    this.done();
    void outcome.started.then(
      (started) => started && this.startWorking(outcome),
    );

    return outcome.notSteered === null
      ? relayWords.queued
      : relayWords.notSteered(outcome.notSteered);
  }

  private startWorking(outcome: PromptOutcome): void {
    this.sentChanged(() => (this.atWork += 1));
    this.working(outcome);
  }

  // Only a Prompt a Turn took has carried the voice instruction; a refused, dropped or withdrawn one has not.
  private working({ ended }: PromptOutcome): void {
    this.instructed = true;
    void ended.then(() => this.done());
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
    return this.instructed ? request : withVoiceInstruction(request);
  }

  private reply(requestId: string, text: string): void {
    this.reports.speak({ kind: 'reply', requestId, text, delivery: 'speak' });
  }

  private tell(text: string, delivery: VoiceDelivery): void {
    for (const piece of inPieces(text))
      this.reports.speak({ kind: 'tell', text: piece, delivery });
  }

  private agentSaid(text: string): void {
    for (const section of readVoiceSections(text)) {
      this.pass(section);
      this.remember(section);
    }
  }

  // A result is spoken; progress and analysis are background.
  private pass({ kind, body }: VoiceMessage): void {
    this.tell(body, kind === 'result' ? 'speak' : 'background');
  }

  private remember({ kind, body }: VoiceMessage): void {
    if (kind === 'result') this.turn = { resultSent: true, last: null };
    else if (kind === 'progress') this.turn.last = body;
  }

  private personTyped(text: string): void {
    this.tell(relayWords.typed(text), 'background');
  }

  private turnEnded(ended: Ended): void {
    const { resultSent, last } = this.turn;
    this.turn = freshTurn();

    if (!resultSent && last) this.tell(last, 'speak');
    this.tell(endingText(ended), endingDelivery(ended, told(resultSent, last)));
  }
}
