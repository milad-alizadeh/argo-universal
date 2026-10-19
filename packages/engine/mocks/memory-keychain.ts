import type { Keychain } from '../src/plugins/services/keychain';

// Stands in for the macOS Keychain, the external boundary; entries are keyed like the real one, by service and account.
export class MemoryKeychain implements Keychain {
  readonly entries = new Map<string, string>();

  get(service: string, account: string): Promise<string | null> {
    return Promise.resolve(this.entries.get(key(service, account)) ?? null);
  }

  set(service: string, account: string, value: string): Promise<void> {
    this.entries.set(key(service, account), value);

    return Promise.resolve();
  }

  delete(service: string, account: string): Promise<void> {
    this.entries.delete(key(service, account));

    return Promise.resolve();
  }
}

const key = (service: string, account: string): string =>
  `${service}\u0000${account}`;
