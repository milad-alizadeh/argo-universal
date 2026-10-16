import { randomUUID } from 'node:crypto';
import { expect, it, onTestFinished } from 'vitest';
import { macKeychain } from './keychain';

// The macOS Keychain is the one external port, so its CLI contract is proven against the real thing.
it.skipIf(process.platform !== 'darwin')(
  'stores, replaces and deletes values in the macOS Keychain, reading a missing item as null',
  async () => {
    const service = `argo.plugin.test-${randomUUID()}`;
    onTestFinished(() => macKeychain.delete(service, 'account'));

    expect(await macKeychain.get(service, 'account')).toBeNull();
    await macKeychain.set(service, 'account', 'pässword "q"\n x');
    expect(await macKeychain.get(service, 'account')).toBe('pässword "q"\n x');
    await macKeychain.set(service, 'account', '');
    expect(await macKeychain.get(service, 'account')).toBe('');
    await macKeychain.delete(service, 'account');
    expect(await macKeychain.get(service, 'account')).toBeNull();
  },
);
