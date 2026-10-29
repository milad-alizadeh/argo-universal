import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Runs a TypeScript entry under tsx with VM modules, which Node enables only at startup and Plugin tests need.
export function launch(main, args = process.argv.slice(2)) {
  const child = spawn(
    process.execPath,
    [
      '--experimental-vm-modules',
      '--import',
      require.resolve('tsx'),
      main,
      ...args,
    ],
    { stdio: 'inherit' },
  );

  forward(child);

  return child;
}

// The launcher stops with its child and exits with its code.
function forward(child) {
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => child.kill(signal));

  child.once('error', (error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });

  child.once('exit', (code) => {
    process.exitCode = code ?? 1;
  });
}
