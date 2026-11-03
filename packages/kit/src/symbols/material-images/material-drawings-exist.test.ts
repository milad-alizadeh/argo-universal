import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

// Only Metro on Android reads these drawings, so a name added to the icon map without its cut drawing breaks that bundle alone.
it('has a drawing on disk for every drawing the Android index imports', () => {
  const index = new URL('material-images.gen.ts', import.meta.url);
  const imports = [
    ...readFileSync(index, 'utf8').matchAll(/from '(\.\.\/[^']+\.xml)'/gu),
  ].map(([, path]) => path);
  const missing = imports.filter((path) => !existsSync(new URL(path, index)));

  expect(imports.length).toBeGreaterThan(0);
  expect(missing).toEqual([]);
});
