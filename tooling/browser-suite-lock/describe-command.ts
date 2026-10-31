import { basename } from 'node:path';

const COMMAND_LENGTH = 160;

// What a process runs, from its `process.argv`: the script's name and its arguments, cut short.
export function describeCommand(argv: string[]): string {
  const [script = '', ...rest] = argv.slice(1);

  return [basename(script), ...rest].join(' ').slice(0, COMMAND_LENGTH);
}
