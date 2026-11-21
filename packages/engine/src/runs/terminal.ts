export { terminalColumns, terminalRows } from '@repo/contracts';

// What the Server asks of the operating system to run a Run: a command in a terminal, in a folder, with these variables added to the login shell's.
export type TerminalLaunch = {
  // The Run's own id; the real terminal carries it on its command line so recovery can tell its process group from a reused one.
  id: string;
  command: string;
  cwd: string;
  // The variables a Run Configuration adds: `$PORT`, `$ARGO_PORT_0` and its own `env`.
  env: Record<string, string>;
  port: number;
};

export type TerminalExit = { exitCode: number };

export interface TerminalProcess {
  pid: number | undefined;
  onData: (listener: (data: string) => void) => void;
  onExit: (listener: (exit: TerminalExit) => void) => void;
  write: (data: string) => void;
  resize: (columns: number, rows: number) => void;
  // Ends the whole process tree and whatever still listens on the Run's port; resolves once none is left.
  stop: () => Promise<void>;
}

// How a Run's terminal starts; tests substitute one that runs nothing.
export type TerminalSpawner = (
  launch: TerminalLaunch,
) => TerminalProcess | Promise<TerminalProcess>;
