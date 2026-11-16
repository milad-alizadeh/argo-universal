import { expect, it } from 'vitest';

it('says what to do when Node imports the kit outside a Plugin, as a test importing a page module does', async () => {
  await expect(import('@argo/plugin-kit')).rejects.toThrow(
    'Move what the test shares with the Plugin',
  );
});
