import { AsyncEntry } from '@napi-rs/keyring';

// Where Plugin Secrets live (ADR-0051): the OS's own store, reached in-process so no Secret is ever in a process's argv.
export interface SecretStore {
  get(service: string, account: string): Promise<string | null>;
  set(service: string, account: string, value: string): Promise<void>;
  delete(service: string, account: string): Promise<void>;
}

type SecretEntry = Pick<
  AsyncEntry,
  'getPassword' | 'setPassword' | 'deleteCredential'
>;

export type OpenSecretEntry = (service: string, account: string) => SecretEntry;

// Linux is pinned to the Secret Service: the library's other fallback, the kernel keyring, forgets every Secret on reboot.
const openOsEntry: OpenSecretEntry = (service, account) =>
  new AsyncEntry(service, account, { linux: { store: 'secret-service' } });

const installHints: Partial<Record<NodeJS.Platform, string>> = {
  darwin: 'Unlock the login Keychain, then try again.',
  win32: 'Start the Credential Manager service, then try again.',
};

const linuxHint =
  'Install and start a Secret Service, such as GNOME Keyring or KWallet, then try again.';

const noSecretStoreMessage = (platform: NodeJS.Platform): string =>
  `Refused: no OS secret store answered, so Argo keeps no Secrets on this machine. ${installHints[platform] ?? linuxHint}`;

// The errors that mean no store is there at all, as opposed to one that refused this item.
const noStoreError =
  /secret service|d-?bus|no storage access|couldn't access platform secure storage/i;

class NoSecretStore extends Error {}

const isNoStore = (error: Error): boolean =>
  error instanceof NoSecretStore || noStoreError.test(error.message);

// Answers a missing store with `answer`, and lets any other failure through.
const whenNoStore =
  <T>(answer: (error: Error) => T) =>
  (error: Error): T => {
    if (isNoStore(error)) return answer(error);
    throw error;
  };

/*
 * With no store there is nothing to read or delete, so those answer as empty; a write is refused, naming what to install,
 * because there is no file fallback (ADR-0051).
 */
export class KeyringSecretStore implements SecretStore {
  constructor(
    private readonly open: OpenSecretEntry,
    private readonly platform: NodeJS.Platform,
  ) {}

  get(service: string, account: string): Promise<string | null> {
    return this.entry(service, account)
      .then((entry) => entry.getPassword())
      .catch(whenNoStore(() => null));
  }

  async set(service: string, account: string, value: string): Promise<void> {
    await this.entry(service, account)
      .then((entry) => entry.setPassword(value))
      .catch(
        whenNoStore((cause) => {
          throw new Error(noSecretStoreMessage(this.platform), { cause });
        }),
      );
  }

  async delete(service: string, account: string): Promise<void> {
    await this.entry(service, account)
      .then((entry) => entry.deleteCredential())
      .catch(whenNoStore(() => false));
  }

  // Opening an entry is where a missing store first shows, so it rejects as one.
  private async entry(service: string, account: string): Promise<SecretEntry> {
    try {
      return this.open(service, account);
    } catch (cause) {
      throw new NoSecretStore(String(cause), { cause });
    }
  }
}

export const osSecretStore: SecretStore = new KeyringSecretStore(
  openOsEntry,
  process.platform,
);

export const pluginSecretService = (pluginId: string): string =>
  `argo.plugin.${pluginId}`;

// A Plugin's secret settings, apart from the secrets it keeps itself through `argo.secrets`.
export const pluginSettingsSecretService = (pluginId: string): string =>
  `${pluginSecretService(pluginId)}.settings`;
