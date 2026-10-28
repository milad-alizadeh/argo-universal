import { runPluginCommand } from '@argo/plugin-kit/cli';

const help = `Usage: argo <command>

Commands:
  server [--watch]            Start the Server
  plugin <validate|test> <dir>  Validate or test a Plugin`;

const write = (line: string): void => void process.stdout.write(`${line}\n`);

async function main([command, ...args]: string[]): Promise<number> {
  if (command === 'plugin') return runPluginCommand(args, write, 'argo plugin');

  return showHelp(command);
}

function showHelp(command: string | undefined): number {
  write(help);

  return command === undefined || command === '--help' ? 0 : 2;
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 2;
}
