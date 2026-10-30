import { runPluginCommand } from '@argo/plugin-kit/cli';
import { commandExitCode, usageExitCode } from './command-error';
import type { CommandIo } from './control-client';
import { runMcp } from './mcp-command';
import { runOperations } from './operations-command';
import { runOperation } from './run-command';
import { waitOperation } from './wait-command';

const help = `Usage: argo <command>

Commands:
  operations [filter] [--json]  Find available Operations
  run <id> [--params '<json>'] [--wait]  Run an Operation
  wait <id>                   Wait for native Session work
  mcp                         Serve Argo tools over MCP on stdio
  server [--watch]            Start the Server
  plugin <validate|test> <dir>  Validate or test a Plugin`;

type Write = (line: string) => void;

// What `argo` reads and writes: standard output and error, and the Server's control procedures.
export type CliIo = CommandIo & { writeError: Write };

type Command = (args: string[], io: CliIo) => Promise<number>;

const commands = new Map<string, Command>([
  ['operations', runOperations],
  ['run', runOperation],
  ['wait', waitOperation],
  ['mcp', runMcp],
  [
    'plugin',
    (args, io): Promise<number> =>
      runPluginCommand(args, io.write, 'argo plugin'),
  ],
]);

// Runs one `argo` command line and answers its exit code; a failure is written to standard error.
export async function runArgo(argv: string[], io: CliIo): Promise<number> {
  try {
    return await dispatch(argv, io);
  } catch (error) {
    io.writeError(String(error));

    return commandExitCode(error);
  }
}

function dispatch([command, ...args]: string[], io: CliIo): Promise<number> {
  const run = commands.get(command ?? '');

  return run ? run(args, io) : Promise.resolve(showHelp(command, io.write));
}

function showHelp(command: string | undefined, write: Write): number {
  write(help);

  return command === undefined || command === '--help' ? 0 : usageExitCode;
}
