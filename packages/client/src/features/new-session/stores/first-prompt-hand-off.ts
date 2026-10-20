import type { InitialConfigOption, SessionNewInput } from '@repo/contracts';
import {
  type EmptySessionPorts,
  type FirstPrompt,
  promptShowTimeoutMs,
} from './empty-session-types';

// Choosing the reader's options; then the first prompt goes, the Feed shows it, and the Session page takes over.
type Phase = 'choosing' | 'sending' | 'showing' | 'handedOff';

export interface HandOffHost {
  ports: () => EmptySessionPorts;
  emit: () => void;
  // The prompt went nowhere: it goes back to the Composer.
  failed: (cause: unknown) => void;
}

// The first prompt's way from Send to the Session page.
export class FirstPromptHandOff {
  private current: Phase = 'choosing';
  // The Session the first prompt went to, which the Session page takes over.
  private promptedId: string | undefined;
  private promptShown = false;
  // A screen that was left hands nothing on: the Session page that took its place keeps its own Session.
  private stopped = false;
  private showTimer: ReturnType<typeof setTimeout> | undefined;

  public constructor(private readonly host: HandOffHost) {}

  public get phase(): Phase {
    return this.current;
  }

  public get sessionId(): string | undefined {
    return this.promptedId;
  }

  // The Server creates the selected checkout and Session, applies options and sends.
  public create(
    input: SessionNewInput,
    configOptions: InitialConfigOption[],
    prompt: FirstPrompt,
  ): void {
    this.current = 'sending';
    this.host.emit();

    this.host
      .ports()
      .open({ ...input, configOptions, prompt })
      .then(
        ({ sessionId }) => this.created(sessionId),
        (cause: unknown) => this.failed(cause),
      );
  }

  private created(sessionId: string): void {
    this.promptedId = sessionId;
    this.showPrompt();
  }

  // The opened Session's Feed holds the first prompt, so the Session page can show it from its first frame.
  public feedShowsPrompt(): void {
    this.promptShown = true;

    if (this.current === 'showing') this.handOff();
  }

  public start(): void {
    this.stopped = false;
  }

  public stop(): void {
    this.stopped = true;
    clearTimeout(this.showTimer);
  }

  private failed(cause: unknown): void {
    this.current = 'choosing';
    this.promptedId = undefined;
    this.promptShown = false;
    this.host.failed(cause);
  }

  // The Session page takes over once the Feed it starts from holds the prompt, so the prompt never drops out.
  private showPrompt(): void {
    this.current = 'showing';

    if (this.stopped) return;

    if (this.promptShown) {
      this.handOff();

      return;
    }

    this.showTimer = setTimeout(() => this.handOff(), promptShowTimeoutMs);
    this.host.emit();
  }

  private handOff(): void {
    clearTimeout(this.showTimer);
    const sessionId = this.handOffId();

    if (sessionId === undefined) return;
    this.current = 'handedOff';
    this.host.ports().clearDraft();
    this.host.ports().handOff(sessionId);
    this.host.emit();
  }

  // The Session to hand on, unless the screen was left or it went already.
  private handOffId(): string | undefined {
    return this.stopped || this.current === 'handedOff'
      ? undefined
      : this.promptedId;
  }
}
