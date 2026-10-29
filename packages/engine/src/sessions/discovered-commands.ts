import type { SlashCommand } from '@repo/contracts';

/*
 * The longest New Session discovery keeps its session open, after the Agent's
 * options are read, for a Slash command list. The options are published before
 * the wait, so it holds back only the save and the final update; the wait ends
 * the moment a list arrives. Agents send it right after opening a session, but
 * one that starts slowly (a cold start, a login check) can take seconds, and a
 * list that misses the cap waits for the next discovery. The cap is also the
 * longest an Agent that sends no list keeps its discovery session open.
 */
export const commandsWaitMs = 10_000;

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
  public async seen(
    signal: AbortSignal,
    waitMs = commandsWaitMs,
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
