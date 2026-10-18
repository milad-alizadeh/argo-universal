import { parseArgs } from 'node:util';
import { runPluginCommand } from './plugin-command';
import { startSupervisor } from './supervisor';

const pluginArgumentsIndex = 3;

if (process.argv[2] === 'plugin') {
  process.exitCode = await runPluginCommand(
    process.argv.slice(pluginArgumentsIndex),
    (line) => process.stdout.write(`${line}\n`),
  );
} else startServer();

function startServer(): void {
  // `--watch` restarts the Engine on a file change (the dev script).
  const { values } = parseArgs({
    options: { watch: { type: 'boolean', default: false } },
  });

  startSupervisor({ watch: values.watch });
}
