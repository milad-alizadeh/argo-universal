import type { SessionNewInput } from '@repo/contracts';
import {
  choiceDebounceMs,
  type EmptySessionChoices,
  type EmptySessionPorts,
  type LiveOptions,
  noop,
} from './empty-session-types';
import { type CurrentSession, LocalSession } from './local-session';

export interface KeeperHost {
  ports: () => EmptySessionPorts;
  changed: () => void;
  opening: () => void;
  opened: () => void;
  failed: (cause: unknown) => void;
}

// Only a Local checkout opens a Session before Send; a New worktree is created at Send.
const localKey = (input: SessionNewInput | undefined): string | undefined =>
  input?.checkout.type === 'main' ? JSON.stringify(input) : undefined;

// Keeps one Local Empty Session open for the current choices: opened at once, replaced once an Agent change settles.
export class LocalSessionKeeper {
  private session: LocalSession | undefined;
  private input: SessionNewInput | undefined;
  private connected = false;
  private key: string | undefined;
  // The Local choices whose Agent change has settled.
  private settledKey: string | undefined;
  private failedKey: string | undefined;
  private debounce: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;

  public constructor(private readonly host: KeeperHost) {}

  public choose({ input, connected }: EmptySessionChoices): void {
    const key = localKey(input);
    this.input = input;
    this.connected = connected;

    if (key !== this.key) this.chooseKey(key);
  }

  // A Session that failed to open opens again.
  public retry(): void {
    this.failedKey = undefined;
  }

  public start(): void {
    this.stopped = false;
  }

  // A Session still opening is closed once it opens, unless the screen started again.
  public stop(): void {
    this.stopped = true;
    clearTimeout(this.debounce);
    this.debounce = undefined;
  }

  // Leaving New Session closes an Empty Session no prompt reached.
  public closeEmpty(): void {
    const session = this.session;

    if (session?.id === undefined) return;
    void session.close(this.host.ports());
    this.session = undefined;
  }

  public advance(): CurrentSession | undefined {
    const session = this.session;

    if (session) return this.keep(session);

    if (this.canOpen()) this.open();

    return undefined;
  }

  public takeLive(live: LiveOptions | undefined): void {
    this.session?.takeLive(live);
  }

  public readingId(): string | undefined {
    return this.session?.readingId();
  }

  public isOpening(): boolean {
    return [
      this.key !== undefined,
      this.key !== this.failedKey,
      this.connected,
      this.session?.busy() ?? true,
    ].every(Boolean);
  }

  private chooseKey(key: string | undefined): void {
    clearTimeout(this.debounce);
    this.debounce = undefined;
    this.key = key;

    // The first Session opens at once; another Agent replaces it once the change settles.
    if (this.session === undefined) {
      this.settledKey = key;

      return;
    }

    this.settledKey = undefined;

    if (key !== undefined)
      this.debounce = setTimeout(() => this.settle(key), choiceDebounceMs);
  }

  private settle(key: string): void {
    this.settledKey = key;
    this.debounce = undefined;
    this.host.changed();
  }

  // New worktree or unsettled choices close the Session at once; one an Agent change is replacing takes no prompt.
  private keep(session: LocalSession): CurrentSession | undefined {
    if (session.key === this.key) return session.current();

    if (this.key === this.settledKey) this.closeStale(session);

    return undefined;
  }

  private canOpen(): boolean {
    return [
      this.key !== undefined,
      this.key === this.settledKey,
      this.key !== this.failedKey,
      this.connected,
    ].every(Boolean);
  }

  // A Session still opening is closed once it has opened.
  private closeStale(session: LocalSession): void {
    if (session.readingId() === undefined) return;
    void session.close(this.host.ports()).finally(() => this.closed(session));
  }

  private closed(session: LocalSession): void {
    if (this.session === session) this.session = undefined;
    this.host.changed();
  }

  private open(): void {
    const input = this.input;

    if (!input || this.key === undefined) return;
    const session = new LocalSession(this.key);
    this.session = session;
    this.host.opening();

    this.host
      .ports()
      .open(input)
      .then(
        ({ sessionId }) => this.opened(session, sessionId),
        (cause: unknown) => this.openFailed(session, cause),
      );
  }

  private opened(session: LocalSession, sessionId: string): void {
    if (this.session === session && !this.stopped) {
      session.opened(sessionId);
      this.host.opened();
      this.host.changed();

      return;
    }

    this.discard(session, sessionId);
  }

  private discard(session: LocalSession, sessionId: string): void {
    this.host.ports().close(sessionId).catch(noop);

    if (this.session === session) this.session = undefined;
  }

  // A failure for choices since changed opens again for the new ones.
  private openFailed(session: LocalSession, cause: unknown): void {
    if (this.session !== session) return;
    this.session = undefined;

    if (session.key === this.key) {
      this.failedKey = session.key;
      this.host.failed(cause);
    }

    this.host.changed();
  }
}
