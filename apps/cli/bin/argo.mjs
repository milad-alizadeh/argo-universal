#!/usr/bin/env node
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '@argo/plugin-kit/launch';

const require = createRequire(import.meta.url);

const [, , command, ...args] = process.argv;

if (command === 'server') {
  const directory = dirname(require.resolve('@repo/server/package.json'));
  const child = launch(join(directory, 'src/main.ts'), args);

  if (child.pid !== undefined)
    process.send?.({ type: 'supervisor.spawned', pid: child.pid }, (error) => {
      if (error) process.stderr.write(`${error.message}\n`);
    });
} else if (command === 'plugin')
  // The Plugin command loads the Engine, so it has its own entry and `argo mcp` starts without it.
  launch(
    fileURLToPath(new URL('../src/plugin-main.ts', import.meta.url)),
    args,
  );
else launch(fileURLToPath(new URL('../src/main.ts', import.meta.url)));
