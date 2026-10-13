import { spawn, type IPty } from 'node-pty';
import type { LaunchLoginTerminal, LoginTerminalProcess } from '../agents';
import { releaseTerminalGroup } from './terminal-process-group';
const terminalCols = 80;
const terminalRows = 24;
const ownTerminal = (
  child: IPty,
  output: (text: string) => void,
): LoginTerminalProcess => {
  const exited = Promise.withResolvers<{ exitCode: number; signal?: number }>();
  const data = child.onData(output);
  const exit = child.onExit(exited.resolve);
  let closing: Promise<void> | undefined;
  const close = closeTerminal(child, exited.promise, [data, exit]);
  return terminalPort(child, exited.promise, () => {
    closing ??= close();
    return closing;
  });
};
export const launchLoginTerminal: LaunchLoginTerminal = async (
  launch,
  output,
) => {
  if (process.platform === 'win32')
    throw new Error('Terminal sign-in is unavailable on this Server');
  const child = spawn(launch.executable, [...launch.args], {
    cwd: launch.cwd,
    env: { TERM: 'xterm-256color', ...launch.env },
    name: 'xterm-256color',
    cols: terminalCols,
    rows: terminalRows,
  });
  return ownTerminal(child, output);
};

const terminalPort = (
  child: IPty,
  exited: LoginTerminalProcess['exited'],
  close: LoginTerminalProcess['close'],
): LoginTerminalProcess => ({
  exited,
  close,
  write: (text) => child.write(text),
  resize: (cols, rows) => child.resize(cols, rows),
});

const closeTerminal =
  (
    child: IPty,
    exited: LoginTerminalProcess['exited'],
    listeners: { dispose: () => void }[],
  ): (() => Promise<void>) =>
  async (): Promise<void> => {
    await releaseTerminalGroup(child.pid);
    await exited;
    for (const listener of listeners) listener.dispose();
  };
