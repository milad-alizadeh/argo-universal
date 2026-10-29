import type { SlashCommand } from '@repo/contracts';

/*
 * How long New Session discovery waits, after the Agent's options are read,
 * for its first Slash command list. Agents send it right after opening a
 * session. The options are published before the wait, so it holds back only
 * the save; a list that arrives later waits for the next discovery.
 */
export const commandsWaitMs = 1500;

// The latest Slash command list the discovery session was sent; `undefined` until one arrives.
export class DiscoveredCommands {
  private latest: SlashCommand[] | undefined;
  private arrival = Promise.withResolvers<void>();

  public get commands(): SlashCommand[] | undefined {
    return this.latest;
  }

  public receive(commands: SlashCommand[]): void {
    this.latest = commands;
    this.arrival.resolve();
  }

  // Resolves when a list is in hand, the wait runs out or the caller aborts.
  public async seen(signal: AbortSignal): Promise<void> {
    if (this.latest || signal.aborted) return;
    const stop = Promise.withResolvers<void>();
    const finish = (): void => stop.resolve();
    const timer = setTimeout(finish, commandsWaitMs);
    signal.addEventListener('abort', finish, { once: true });

    await Promise.race([this.arrival.promise, stop.promise]);
    clearTimeout(timer);
    signal.removeEventListener('abort', finish);
  }
}
