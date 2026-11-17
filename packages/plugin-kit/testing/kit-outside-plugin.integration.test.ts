import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';

const run = promisify(execFile);

// Node imports the kit the way a Plugin test does when it imports a module that draws: its components, or JSX.
const importKit = (
  specifier: string,
): Promise<{ stdout: string; stderr: string }> =>
  run(
    process.execPath,
    ['--input-type=module', '-e', `import '${specifier}';`],
    { cwd: import.meta.dirname },
  );

it.each([
  '@argo/plugin-kit',
  '@argo/plugin-kit/jsx-runtime',
  '@argo/plugin-kit/jsx-dev-runtime',
])(
  'says what to do when Node imports %s outside a Plugin, as a test importing a page module does',
  async (specifier) => {
    await expect(importKit(specifier)).rejects.toThrow(
      'Move what the test shares with the Plugin',
    );
  },
);
