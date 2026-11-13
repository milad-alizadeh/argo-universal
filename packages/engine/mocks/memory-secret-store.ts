import {
  KeyringSecretStore,
  type SecretStore,
} from '../src/plugins/services/secret-store';

// Stands in for the OS secret store, the external boundary; entries are keyed like the real one, by service and account.
export class MemorySecretStore implements SecretStore {
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

// The real keyring adapter on a machine with no store, as on headless Linux without a Secret Service.
export const absentSecretStore = (platform: NodeJS.Platform): SecretStore =>
  new KeyringSecretStore(() => {
    throw new Error(
      'Platform secure storage failure: org.freedesktop.secrets was not provided by any .service files',
    );
  }, platform);
