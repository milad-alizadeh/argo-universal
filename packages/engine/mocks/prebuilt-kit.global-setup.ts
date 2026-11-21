import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildKit, prebuiltKitVariable } from '../src/plugins/kit/bundle';

// Bundles the Plugin kit once for the run; every Plugin host the tests start reads it.
export default async function setup(): Promise<() => void> {
  const directory = mkdtempSync(join(tmpdir(), 'argo-plugin-kit-'));
  const file = join(directory, 'kit.js');

  writeFileSync(file, await buildKit());
  process.env[prebuiltKitVariable] = file;

  return (): void => {
    delete process.env[prebuiltKitVariable];
    rmSync(directory, { recursive: true, force: true });
  };
}
