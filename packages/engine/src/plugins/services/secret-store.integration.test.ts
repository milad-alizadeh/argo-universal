import { randomUUID } from 'node:crypto';
import { expect, it, onTestFinished } from 'vitest';
import { osSecretStore } from './secret-store';

// The OS secret store is the one external port, so the keyring adapter is proven against the real macOS Keychain, locally and in CI.
it.skipIf(process.platform !== 'darwin')(
  'stores, replaces and deletes values in the OS secret store, reading a missing item as null and deleting it twice',
  async () => {
    const service = `argo.plugin.test-${randomUUID()}`;
    onTestFinished(() => osSecretStore.delete(service, 'account'));

    expect(await osSecretStore.get(service, 'account')).toBeNull();
    await osSecretStore.set(service, 'account', 'pässword "q"\n x');
    expect(await osSecretStore.get(service, 'account')).toBe(
      'pässword "q"\n x',
    );
    await osSecretStore.set(service, 'account', '');
    expect(await osSecretStore.get(service, 'account')).toBe('');
    await osSecretStore.delete(service, 'account');
    expect(await osSecretStore.get(service, 'account')).toBeNull();
    await osSecretStore.delete(service, 'account');
  },
);
