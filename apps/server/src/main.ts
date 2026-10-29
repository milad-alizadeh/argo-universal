import { parseArgs } from 'node:util';
import { startSupervisor } from './supervisor';

type ServerArguments = { watch: boolean };

// `--watch` restarts the Engine on a file change (the dev script).
function readServerArguments(): ServerArguments | undefined {
  try {
    return parseArgs({
      options: { watch: { type: 'boolean', default: false } },
    }).values;
  } catch (cause) {
    process.stderr.write(`${String(cause)}\n`);
    process.exitCode = 2;

    return undefined;
  }
}

const options = readServerArguments();

if (options) startSupervisor(options);
