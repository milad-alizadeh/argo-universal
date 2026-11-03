import { runCli } from './cli';
import { createControlClient } from './control-client';

process.exitCode = await runCli(process.argv.slice(2), {
  write: (line) => void process.stdout.write(`${line}\n`),
  writeError: (line) => void process.stderr.write(`${line}\n`),
  client: createControlClient(),
});
