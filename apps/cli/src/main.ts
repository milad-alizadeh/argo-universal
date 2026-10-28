import { runPluginCommand } from '@argo/plugin-kit/cli';
import { commandExitCode } from './command-error';
import { runOperations } from './operations-command';
import { runOperation } from './run-command';

const help = `Usage: argo <command>

Commands:
  operations [filter] [--json]  Find available Operations
  run <id> [--params '<json>']  Run an Operation
  server [--watch]            Start the Server
  plugin <validate|test> <dir>  Validate or test a Plugin`;

const write = (line: string): void => void process.stdout.write(`${line}\n`);

type Command = (
  args: string[],
  write: (line: string) => void,
) => Promise<number>;

const commands = new Map<string, Command>([
  ['operations', runOperations],
  ['run', runOperation],
  [
    'plugin',
    (args, output): Promise<number> =>
      runPluginCommand(args, output, 'argo plugin'),
  ],
]);

async function main([command, ...args]: string[]): Promise<number> {
  const run = commands.get(command ?? '');

  return run ? run(args, write) : showHelp(command);
}

function showHelp(command: string | undefined): number {
  write(help);

  return command === undefined || command === '--help' ? 0 : 2;
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = commandExitCode(error);
}
