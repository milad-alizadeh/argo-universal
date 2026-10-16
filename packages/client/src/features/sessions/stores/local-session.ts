import type { InitialConfigOption, SessionConfigOption } from '@repo/contracts';
import {
  changeKey,
  chosenOptions,
  nextConfigChange,
} from '../state/session-option-choices';
import {
  type EmptySessionConfiguration,
  type EmptySessionPorts,
  type LiveOptions,
  noop,
} from './empty-session-types';

// The open Session for the current choices, ready for the reader's choices and the first prompt.
export interface CurrentSession {
  session: LocalSession;
  id: string;
}

// One Local Empty Session, opened for one set of choices.
export class LocalSession {
  private openedId: string | undefined;
  private closing = false;
  private live: SessionConfigOption[] | undefined;
  // True while one of the reader's choices reaches the Session.
  private setting = false;
  private readonly tried = new Set<string>();

  public constructor(public readonly key: string) {}

  public get id(): string | undefined {
    return this.openedId;
  }

  public opened(sessionId: string): void {
    this.openedId = sessionId;
  }

  // A Session being closed is no longer read.
  public readingId(): string | undefined {
    return this.closing ? undefined : this.openedId;
  }

  public current(): CurrentSession | undefined {
    const id = this.readingId();

    return id === undefined ? undefined : { session: this, id };
  }

  public takeLive(live: LiveOptions | undefined): void {
    if (live !== undefined && live.sessionId === this.openedId)
      this.live = live.configOptions;
  }

  // Each value is tried once, so a refused one stays as the Session has it.
  public nextChange({
    saved,
    picks,
  }: EmptySessionConfiguration): InitialConfigOption | undefined {
    if (!this.live) return undefined;

    return nextConfigChange(
      this.live,
      chosenOptions(this.live, saved, picks),
      this.tried,
    );
  }

  // One of the reader's choices reaches the Session; a refused one is not tried again.
  public apply(
    ports: EmptySessionPorts,
    change: InitialConfigOption,
  ): Promise<void> {
    const id = this.readingId();

    if (id === undefined) return Promise.resolve();
    this.setting = true;
    this.tried.add(changeKey(change));

    return ports
      .setConfigOption(id, change)
      .then((configOptions) => this.applied(configOptions), noop)
      .finally(() => {
        this.setting = false;
      });
  }

  private applied(configOptions: SessionConfigOption[]): void {
    this.live = configOptions;
  }

  public busy(): boolean {
    return this.readingId() === undefined || !this.live || this.setting;
  }

  // Closes the Session unless it is closing already.
  public close(ports: EmptySessionPorts): Promise<void> {
    const id = this.readingId();
    this.closing = true;

    if (id === undefined) return Promise.resolve();

    return ports.close(id).then(noop, noop);
  }
}
