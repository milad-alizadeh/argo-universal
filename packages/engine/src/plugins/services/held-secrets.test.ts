import { MemorySecretStore } from '@repo/engine/mocks/secret-store';
import { expect, it } from 'vitest';
import { HeldSecrets } from './held-secrets';

const token = 'pa"ss/wo rd+1';

it('scrubs a held value as written, as a JSON string escapes it and as a URL escapes it', async () => {
  const secrets = new HeldSecrets();

  const line = await secrets.during([token], async () =>
    secrets.scrub(
      [
        token,
        JSON.stringify({ token }),
        `?t=${encodeURIComponent(token)}`,
      ].join(' '),
    ),
  );

  expect(line).toBe('[secret] {"token":"[secret]"} ?t=[secret]');
  expect(secrets.scrub(token)).toBe(token);
});

it('holds every Secret the store reads or writes from then on', async () => {
  const secrets = new HeldSecrets();
  const store = secrets.keeping(new MemorySecretStore());

  await store.set('argo.plugin.one', 'token', 'kept-token');

  expect(secrets.scrub('read kept-token')).toBe('read [secret]');
  await expect(store.get('argo.plugin.one', 'token')).resolves.toBe(
    'kept-token',
  );
});
