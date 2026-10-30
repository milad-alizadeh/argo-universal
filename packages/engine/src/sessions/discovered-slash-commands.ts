import type { SlashCommand } from '@repo/contracts';

// A slow-starting Agent can send its list seconds after opening; one that misses the wait shows at the next discovery.
export const slashCommandsWaitMs = 10_000;

// The latest Slash command list the discovery session was sent; `undefined` until one arrives.
export class DiscoveredSlashCommands {
  private latest: SlashCommand[] | undefined;
  private arrival = Promise.withResolvers<void>();

  public get list(): SlashCommand[] | undefined {
    return this.latest;
  }

  public receive(slashCommands: SlashCommand[]): void {
    this.latest = slashCommands;
    this.arrival.resolve();
  }

  // Resolves when a list is in hand, the wait runs out or the caller aborts.
  public async seen(
    signal: AbortSignal,
    waitMs = slashCommandsWaitMs,
  ): Promise<void> {
    if (this.latest || signal.aborted) return;
    const stop = Promise.withResolvers<void>();
    const finish = (): void => stop.resolve();
    const timer = setTimeout(finish, waitMs);
    signal.addEventListener('abort', finish, { once: true });

    await Promise.race([this.arrival.promise, stop.promise]);
    clearTimeout(timer);
    signal.removeEventListener('abort', finish);
  }
}
