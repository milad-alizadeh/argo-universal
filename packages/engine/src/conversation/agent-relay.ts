import { withVoiceInstruction } from '../feed';
import { AgentWords } from './agent-words';
import type { RelayCall, VoiceSay } from './conversation-types';
import type { PersonWords } from './person-turns';
import { relayWords } from './relay-words';
import { SentPrompts, type SentPrompt } from './sent-prompts';
import type {
  PromptOutcome,
  SessionHappening,
  ConversationSessions,
} from './session-link';
import { SpokenConsent } from './spoken-consent';
import { isTold, speechOf } from './started-speech';
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
  private readonly prompts = new SentPrompts();
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
    const prompt = this.prompts.send();

    if (prompt.startedRunning) this.reports.turnsRunning(true);

    return this.sessions
      .prompt(
        this.call.sessionId,
        prompt.instructs ? withVoiceInstruction(text) : text,
      )
      .then(
        (outcome: PromptOutcome) => this.sent(prompt, outcome),
        (error: Error) => {
          this.changed(prompt.rejected());

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
    this.wordsHeard(happening);
  }

  // A question its Session asks, or news of a Session or Agent it started, is spoken as it comes.
  private wordsHeard(
    happening: Exclude<
      SessionHappening,
      { type: 'turn.ended' } | PermissionHappening
    >,
  ): void {
    if (isTold(happening)) this.words.tell(speechOf(happening), 'speak');
    else this.words.said(happening);
  }

  private permissionHeard(happening: PermissionHappening): void {
    const announcement = this.permission.heard(happening);

    if (announcement === null) return;
    this.spoken.announced();
    this.words.tell(announcement, 'speak');
  }

  // What the voice is told of a Prompt that reached the Session; a queued one waits for its Turn before it counts.
  private sent(prompt: SentPrompt, outcome: PromptOutcome): string {
    if (outcome.status !== 'queued') {
      this.changed(prompt.started());
      this.endsWith(prompt, outcome);

      return relayWords[outcome.status];
    }

    this.changed(prompt.queued());
    void outcome.started.then((started) => {
      if (!started) return this.changed(prompt.neverStarted());

      this.changed(prompt.started());
      this.endsWith(prompt, outcome);
    });

    return outcome.notSteered === null
      ? relayWords.queued
      : relayWords.notSteered(outcome.notSteered);
  }

  private endsWith(prompt: SentPrompt, { ended }: PromptOutcome): void {
    void ended.then(() => this.changed(prompt.ended()));
  }

  // Reports what the call has running when a change flipped it.
  private changed(flipped: boolean): void {
    if (flipped) this.reports.turnsRunning(this.prompts.running);
  }

  private reply(requestId: string, text: string): void {
    this.reports.speak({ kind: 'reply', requestId, text, delivery: 'speak' });
  }
}
