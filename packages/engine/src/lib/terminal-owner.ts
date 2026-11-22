import { join } from 'node:path';

// The id travels in the owner's command line so recovery can tell it from a reused process.
export const terminalOwnerToken = (id: string): string => `argo-run-${id}`;

export const shellTerminalOutputFolder = (home: string): string =>
  join(home, 'shell-terminal-output');

export const shellTerminalOutputPath = (home: string, id: string): string =>
  join(shellTerminalOutputFolder(home), `${id}.log`);
