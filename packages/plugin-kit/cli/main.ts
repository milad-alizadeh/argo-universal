import { runPluginCommand } from './plugin-command';

process.exitCode = await runPluginCommand(
  process.argv.slice(2),
  (line) => process.stdout.write(`${line}\n`),
  'argo-plugin',
);
