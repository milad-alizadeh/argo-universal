import type { SessionNewInput, SessionOpenError } from '@repo/contracts';
import { sessionOpenError } from '../components/failure-messages';
import {
  type EmptySessionChoices,
  type EmptySessionConfiguration,
  type EmptySessionPorts,
  type EmptySessionState,
  type FirstPrompt,
  type LiveOptions,
  sameEmptySessionState,
} from './empty-session-types';
import { FirstPromptHandOff } from './first-prompt-hand-off';
import { LocalSessionKeeper } from './local-empty-session';
import type { CurrentSession } from './local-session';

// New Session's Empty Session: opened at once for a Local checkout, reopened when the Agent changes, prompted once.
export class EmptySessionStore {
  private readonly keeper = new LocalSessionKeeper({
    ports: (): EmptySessionPorts => this.ports,
    changed: (): void => this.reconcile(),
    // A retried open keeps its failure on show until it settles.
    opening: (): void => {
      if (!this.retrying) this.error = undefined;
    },
    opened: (): void => {
      this.error = undefined;
      this.retrying = false;
    },
    // A Send stays queued through a failed open until Retry or a sign-in opens it.
    failed: (cause): void => {
      this.retrying = false;
      this.error = sessionOpenError(cause);
    },
  });
  private readonly handOff = new FirstPromptHandOff({
    ports: (): EmptySessionPorts => this.ports,
    emit: (): void => this.emit(),
    failed: (cause): void => {
      this.fail(cause);
      this.reconcile();
    },
  });
  private input: SessionNewInput | undefined;
  private configuration: EmptySessionConfiguration = {
    saved: {},
    picks: {},
    initial: [],
  };
  private pending: FirstPrompt | undefined;
  private error: SessionOpenError | undefined;
  private retrying = false;
  private stopped = false;
  private readonly listeners = new Set<() => void>();
  private state: EmptySessionState = this.currentState();

  public constructor(private ports: EmptySessionPorts) {}

  // The screen's latest ports, so each call follows its current client and draft.
  public setPorts(ports: EmptySessionPorts): void {
    this.ports = ports;
  }

  public readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => void this.listeners.delete(listener);
  };

  public readonly getState = (): EmptySessionState => this.state;

  // Choices that are not settled, as while a refetch runs, keep the last settled ones and their Empty Session.
  public choose({ input, connected }: EmptySessionChoices): void {
    this.input = input ?? this.input;
    this.keeper.choose({ input: this.input, connected });
    this.reconcile();
  }

  // The reader's choices, and the open Session's options as its Feed reads them.
  public configure(
    configuration: EmptySessionConfiguration,
    live?: LiveOptions,
  ): void {
    this.configuration = configuration;
    this.keeper.takeLive(live);
    this.reconcile();
  }

  public send(prompt: FirstPrompt): void {
    if (this.handOff.phase !== 'choosing') return;
    this.pending = prompt;
    this.deliver(prompt);
  }

  // A failed open tries again: Retry, a finished sign-in, or the Connection reopening.
  public retry(): void {
    this.retrying = this.keeper.retry() && this.error !== undefined;
    this.reconcile();
  }

  public feedShowsPrompt(): void {
    this.handOff.feedShowsPrompt();
  }

  public start(): void {
    this.stopped = false;
    this.handOff.start();
    this.keeper.start();
    this.reconcile();
  }

  // Leaving New Session closes an Empty Session no prompt reached; a prompted one is the Session page's.
  public stop(): void {
    this.stopped = true;
    this.handOff.stop();
    this.keeper.stop();

    if (this.handOff.phase === 'choosing') this.keeper.closeEmpty();
  }

  // A New worktree is created at Send; on a Local checkout whose open failed, the prompt waits for Retry or a sign-in.
  private deliver(prompt: FirstPrompt): void {
    const input = this.input;

    if (input?.checkout.type === 'worktree') {
      this.retrying = this.error !== undefined;
      this.handOff.create(input, this.configuration.initial, prompt);
    } else this.reconcile();
  }

  private reconcile(): void {
    if (this.handOff.phase === 'choosing' && !this.stopped) this.advance();
    this.emit();
  }

  // The reader's choices reach the Session one at a time, model before effort; the first prompt waits for its options and them.
  private advance(): void {
    const current = this.keeper.advance();

    if (current && !current.session.busy()) this.applyOrPrompt(current);
  }

  private applyOrPrompt(current: CurrentSession): void {
    const change = current.session.nextChange(this.configuration);

    if (change)
      void current.session
        .apply(this.ports, change)
        .finally(() => this.reconcile());
    else if (this.pending) this.handOff.prompt(current.id, this.pending);
  }

  private fail(cause: unknown): void {
    this.retrying = false;
    this.error = sessionOpenError(cause);
    this.pending = undefined;
  }

  private currentState(): EmptySessionState {
    return {
      error: this.error,
      retrying: this.retrying,
      pendingPrompt: this.pending !== undefined,
      openSessionId: this.handOff.sessionId ?? this.keeper.readingId(),
      opening: this.handOff.phase === 'choosing' && this.keeper.isOpening(),
      handedOff: this.handOff.phase === 'handedOff',
    };
  }

  private emit(): void {
    const next = this.currentState();

    if (sameEmptySessionState(next, this.state)) return;
    this.state = next;

    for (const listener of this.listeners) listener();
  }
}
