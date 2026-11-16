import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';

const run = promisify(execFile);

// Node imports the kit the way a Plugin test does when it imports a module that draws.
const importKit = (): Promise<{ stdout: string; stderr: string }> =>
  run(
    process.execPath,
    ['--input-type=module', '-e', "import '@argo/plugin-kit';"],
    {
      cwd: import.meta.dirname,
    },
  );

it('says what to do when Node imports the kit outside a Plugin, as a test importing a page module does', async () => {
  await expect(importKit()).rejects.toThrow(
    'Move what the test shares with the Plugin',
  );
});
