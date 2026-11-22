import type { ShellTerminal } from '@repo/contracts';
import type { RunLifecycle } from './run-lifecycle';
import type { RunCheckout } from './runs-input';
import type { ShellTerminals } from './shell-terminals';
import type { TerminalSessions } from './terminal-sessions';

type ArchivedSessions = {
  sessionIds: readonly string[];
  checkout?: RunCheckout;
};

export class TerminalLifecycle {
  public constructor(
    private readonly runs: RunLifecycle,
    private readonly shells: ShellTerminals,
    private readonly sessions: TerminalSessions,
  ) {}

  public openShell(sessionId: string): Promise<ShellTerminal> {
    return this.shells.open(this.sessions.forStart(sessionId), sessionId);
  }

  public closeShell(
    sessionId: string | undefined,
    shellId: string,
  ): Promise<void> {
    return this.shells.close(this.sessions.checkout(sessionId), shellId);
  }

  // A Session's shells end with it. A Checkout's Runs end only when the archived Session owned it.
  public async endArchived({
    sessionIds,
    checkout,
  }: ArchivedSessions): Promise<void> {
    await Promise.all([
      this.shells.closeOwners(new Set(sessionIds)),
      checkout && this.closeCheckout(checkout),
    ]);
  }

  public removeCheckout(
    checkout: RunCheckout,
    remove: () => Promise<void>,
  ): Promise<void> {
    return this.closeCheckout(checkout, remove);
  }

  private closeCheckout(
    checkout: RunCheckout,
    remove?: () => Promise<void>,
  ): Promise<void> {
    return this.runs.closeCheckout(
      checkout,
      () => this.shells.closeCheckout(checkout),
      remove,
    );
  }

  public async close(): Promise<void> {
    await Promise.all([this.runs.close(), this.shells.closeAll()]);
  }
}
