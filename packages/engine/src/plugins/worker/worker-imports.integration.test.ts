import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

// A worker is handed the kit the host bundled, so nothing it loads may bundle the kit again.
it('has no worker module that imports the kit bundler', async () => {
  const folder = fileURLToPath(new URL('.', import.meta.url));
  const names = (await readdir(folder)).filter((name) => name.endsWith('.ts'));

  const importing = [];

  for (const name of names) {
    const source = await readFile(join(folder, name), 'utf8');

    if (/from\s+['"][^'"]*kit\/bundle(\.ts)?['"]/.test(source))
      importing.push(name);
  }

  expect(importing).toEqual([]);
});
