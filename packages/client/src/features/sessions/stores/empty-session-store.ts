import type { SessionNewInput } from '@repo/contracts';
import { StoreListeners } from '../../../lib/store-listeners';
import type { OpenAgain } from '../types/new-session-attempt';
import {
  failedOpen,
  openingAgain,
  settledOpen,
} from '../utils/new-session-attempt';
import {
  type EmptySessionChoices,
  type EmptySessionConfiguration,
  type EmptySessionPorts,
  type EmptySessionState,
  type FirstPrompt,
  sameEmptySessionState,
} from './empty-session-types';
import { FirstPromptHandOff } from './first-prompt-hand-off';

// Both checkout types create a Session only when the reader sends.
export class EmptySessionStore {
  private readonly handOff = new FirstPromptHandOff({
    ports: (): EmptySessionPorts => this.ports,
    emit: (): void => {
      if (
        this.handOff.phase === 'showing' ||
        this.handOff.phase === 'handedOff'
      )
        this.outcome = settledOpen;
      this.emit();
    },
    failed: (cause): void => {
      this.fail(cause);
      this.emit();
    },
  });
  private input: SessionNewInput | undefined;
  private choiceKey: string | undefined;
  private configuration: EmptySessionConfiguration = {
    initial: [],
  };
  private pending: FirstPrompt | undefined;
  private outcome = settledOpen;
  private stopped = false;
  private readonly listeners = new StoreListeners();
  private state: EmptySessionState = this.currentState();

  public constructor(private ports: EmptySessionPorts) {}

  // The screen's latest ports, so each call follows its current client and draft.
  public setPorts(ports: EmptySessionPorts): void {
    this.ports = ports;
  }

  public readonly subscribe = this.listeners.subscribe;

  public readonly getState = (): EmptySessionState => this.state;

  // Incomplete choices cannot send a stale Agent or Project.
  public choose({ input, connected }: EmptySessionChoices): void {
    if (input) this.chooseIdentity(input);
    this.input = connected ? input : undefined;
    this.emit();
  }

  private chooseIdentity(input: SessionNewInput): void {
    const key = JSON.stringify([input.agent, input.projectId, input.checkout]);

    if (key !== this.choiceKey) this.outcome = settledOpen;
    this.choiceKey = key;
  }

  // Keep unsent choices until Send.
  public configure(configuration: EmptySessionConfiguration): void {
    this.configuration = configuration;
    this.emit();
  }

  public send(prompt: FirstPrompt): void {
    if (this.handOff.phase !== 'choosing') return;
    this.pending = prompt;
    this.deliver(prompt);
  }

  // Retry and completed sign-in resend the current draft. Reconnection never sends.
  public openAgain(cause: OpenAgain): void {
    this.createAgain(cause);
  }

  public feedShowsPrompt(): void {
    this.handOff.feedShowsPrompt();
  }

  public start(): void {
    this.stopped = false;
    this.handOff.start();
    this.emit();
  }

  // Leaving stops navigation; a submitted Session belongs to the Server.
  public stop(): void {
    this.stopped = true;
    this.handOff.stop();
  }

  // Only an explicit action can retry a failed Send.
  private createAgain(cause: OpenAgain): void {
    if (cause.by === 'user') cause.sendDraft();
  }

  private deliver(prompt: FirstPrompt): void {
    if (!this.input || this.stopped) {
      this.pending = undefined;
      this.emit();

      return;
    }

    this.outcome = openingAgain(this.outcome);
    this.handOff.create(this.input, this.configuration.initial, prompt);
  }

  private fail(cause: unknown): void {
    this.outcome = failedOpen(cause, this.ports.connectionState());
    this.pending = undefined;
  }

  private currentState(): EmptySessionState {
    return {
      ...this.outcome,
      pendingPrompt: this.pending !== undefined,
      openSessionId: this.handOff.sessionId,
      opening: this.handOff.phase === 'sending',
      handedOff: this.handOff.phase === 'handedOff',
    };
  }

  private emit(): void {
    const next = this.currentState();

    if (sameEmptySessionState(next, this.state)) return;
    this.state = next;

    this.listeners.notify();
  }
}
