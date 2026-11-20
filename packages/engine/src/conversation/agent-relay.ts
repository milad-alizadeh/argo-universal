import { withVoiceInstruction } from '../feed';
import { AgentWords } from './agent-words';
import type { RelayCall, VoiceSay } from './conversation-types';
import type { PersonWords } from './person-turns';
import { relayWords } from './relay-words';
import type {
  PromptOutcome,
  SessionHappening,
  ConversationSessions,
} from './session-link';
import { SpokenConsent } from './spoken-consent';
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

/*
 * One Conversation's go-between for its Session (ADR-0064): what the person asks for becomes a Prompt, and what the Agent
 * says, and when its Turn ends or fails, goes back to the voice. Tool output never does.
 */
export class AgentRelay {
  private instructed = false;
  // Requests not yet answered, and Prompts the call sent whose Turn started and has not ended; a queued one counts from its Turn's start.
  private atWork = 0;
  private readonly permission = new WaitingPermission();
  private readonly words: AgentWords;
  private readonly spoken: SpokenConsent;

  public constructor(
    private readonly sessions: ConversationSessions,
    private readonly call: RelayCall,
    private readonly reports: RelayReports,
  ) {
    this.words = new AgentWords(reports.speak);
    this.spoken = new SpokenConsent({
      sessions,
      sessionId: call.sessionId,
      permission: this.permission,
    });
  }

  /*
   * The person asked for work, answered a Permission request, or said "stop": the Agent gets the work, the request its
   * answer or the Turn is cancelled, and the voice is told what happened. `turnId` is the person's turn it was heard in.
   */
  public async request(
    requestId: string,
    text: string,
    turnId?: string,
  ): Promise<void> {
    const control = this.spoken.answer(text, turnId);

    this.reply(
      requestId,
      control
        ? await control
        : this.permission.answering(await this.work(text)),
    );
  }

  public personSaid(words: PersonWords): void {
    this.spoken.heard(words);
  }

  // The call ended: nothing the person said applies any more.
  public close(): void {
    this.spoken.close();
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
    if (happening.type === 'turn.ended') {
      this.permission.turnEnded();

      return this.words.turnEnded(happening);
    }

    if (isPermissionHappening(happening))
      return this.permissionHeard(happening);
    this.words.said(happening);
  }

  private permissionHeard(happening: PermissionHappening): void {
    const announcement = this.permission.heard(happening);

    if (announcement === null) return;
    this.spoken.announced();
    this.words.tell(announcement, 'speak');
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
}
