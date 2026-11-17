import type { PluginAccount } from '@repo/contracts/plugins/accounts';
import type { AccountCredential } from './account-headers';

type Shared = { pluginId: string; request: Promise<AccountCredential | null> };

/*
 * One token request per Account at a time. Borrows that arrive while it is out share it, its deadline and its
 * answer; the next borrow after it settles asks the provider again, so no token outlives its request (ADR-0036).
 */
export class SharedTokenRequests {
  private readonly inFlight = new Map<string, Shared>();

  share(
    account: PluginAccount,
    start: () => Promise<AccountCredential | null>,
  ): Promise<AccountCredential | null> {
    const key = accountKey(account);
    const running = this.inFlight.get(key);

    if (running) return running.request;

    const request = start().finally(() => this.settled(key, request));

    this.inFlight.set(key, { pluginId: account.providedBy, request });

    return request;
  }

  // A released provider's requests are failing; a borrow after the release starts a new one.
  forget(pluginId: string): void {
    for (const [key, shared] of this.inFlight)
      if (shared.pluginId === pluginId) this.inFlight.delete(key);
  }

  clear(): void {
    this.inFlight.clear();
  }

  private settled(
    key: string,
    request: Promise<AccountCredential | null>,
  ): void {
    if (this.inFlight.get(key)?.request === request) this.inFlight.delete(key);
  }
}

const accountKey = ({ providedBy, host, id }: PluginAccount): string =>
  JSON.stringify([providedBy, host, id]);
