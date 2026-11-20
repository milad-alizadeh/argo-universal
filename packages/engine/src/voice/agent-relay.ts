import {
  readVoiceSections,
  withVoiceInstruction,
  type VoiceMessage,
} from '../feed';
import type { RelayCall, VoiceSay } from './call-types';
import { inPieces } from './pieces';
import type { VoiceDelivery } from './provider';
import { relayWords } from './relay-words';
import type {
  PromptOutcome,
  SessionHappening,
  VoiceSessions,
} from './session-link';
import { isStopRequest, stopWork } from './spoken-stop';
import { isTold, speechOf } from './started-speech';
import { endingDelivery, endingText, told } from './turn-ending';
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
  // Prompts the call sent whose Turn has not ended, queued ones included; the Session says when each is done.
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
    this.heard(happening);
  }

  // A question its Session asks, or news of a Session or Agent it started, is spoken as it comes (ADR-0064).
  private heard(
    happening: Exclude<
      SessionHappening,
      { type: 'turn.ended' } | PermissionHappening
    >,
  ): void {
    if (isTold(happening)) this.tell(speechOf(happening), 'speak');
    else this.said(happening);
  }

  private permissionHeard(happening: PermissionHappening): void {
    const announcement = this.permission.heard(happening);

    if (announcement !== null) this.tell(announcement, 'speak');
  }

  // What the voice is told of a Prompt that reached the Session; it stays at work until the Session says its Turn ended.
  private sent(outcome: PromptOutcome): string {
    // Only a Prompt the Session took has carried the voice instruction; a refused or dropped one has not.
    this.instructed = true;
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
    if (happening.type === 'person.typed')
      return this.personTyped(happening.text);
    this.agentSaid(happening.text, happening.turnless);
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

  // A message outside any Turn has no Turn end to speak its progress at, so only its result is spoken (#2506).
  private agentSaid(text: string, turnless: boolean): void {
    for (const section of readVoiceSections(text)) {
      this.pass(section);

      if (!turnless) this.remember(section);
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

  private turnEnded(
    ended: Extract<SessionHappening, { type: 'turn.ended' }>,
  ): void {
    const { resultSent, last } = this.turn;
    this.turn = freshTurn();

    if (!resultSent && last) this.tell(last, 'speak');
    this.tell(endingText(ended), endingDelivery(ended, told(resultSent, last)));
  }
}
