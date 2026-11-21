import { setTimeout as delay } from 'node:timers/promises';
import { releaseProcessGroup } from '@repo/process/group';
import {
  ptyOwnerDescriptor,
  releasePtySession,
} from '@repo/process/pty-session';
import { spawn } from 'node-pty';
import { ensureSpawnHelper, shellEnvironment } from '../agents';
import { terminalOwnerToken } from '../lib/terminal-owner';
import { killPortListeners } from './run-processes';
import {
  terminalColumns,
  terminalRows,
  type TerminalExit,
  type TerminalLaunch,
  type TerminalProcess,
  type TerminalSpawner,
} from './terminal';

const graceMs = 3000;

type TerminalLifetime =
  | { port: number }
  | { token: string; outputPath: string };

class PtyTerminal implements TerminalProcess {
  private exit?: TerminalExit;
  private readonly exited = Promise.withResolvers<void>();
  private readonly exitListeners: ((exit: TerminalExit) => void)[] = [];
  public readonly pid: number;
  public constructor(
    private readonly child: ReturnType<typeof spawn>,
    private readonly lifetime: TerminalLifetime,
  ) {
    this.pid = child.pid;
    child.onExit((result) => {
      this.exit = { exitCode: result.exitCode };

      for (const listener of this.exitListeners) listener(this.exit);
      this.exited.resolve();
    });
  }
  public onData(listener: (data: string) => void): void {
    this.child.onData(listener);
  }
  public onExit(listener: (exit: TerminalExit) => void): void {
    if (this.exit) listener(this.exit);
    else this.exitListeners.push(listener);
  }
  public write(data: string): void {
    this.child.write(data);
  }
  public resize(width: number, height: number): void {
    this.child.resize(width, height);
  }
  public async stop(): Promise<void> {
    if ('outputPath' in this.lifetime) {
      await releasePtySession({ pid: this.pid, ...this.lifetime });
      await this.exited.promise;

      return;
    }

    await this.stopRun(this.lifetime.port);
  }

  // SIGTERM to the process group, SIGKILL after the grace period, then whatever still listens on the Run's port.
  private async stopRun(port: number): Promise<void> {
    if (!this.exit) {
      this.signalGroup('SIGTERM');
      await Promise.race([this.exited.promise, delay(graceMs)]);
    }

    await releaseProcessGroup(this.pid);

    await killPortListeners(port);
    await this.exited.promise;
  }
  private signalGroup(signal: NodeJS.Signals): void {
    try {
      process.kill(-this.pid, signal);
    } catch {
      // The group is already gone.
    }
  }
}

// The Run's command under the user's login shell, in a terminal, with the login shell's environment and the Run's own variables.
export const launchTerminal: TerminalSpawner = async (
  launch: TerminalLaunch,
) => {
  if (process.platform === 'win32')
    throw new Error('Runs are unavailable on this Server');

  ensureSpawnHelper();
  const base = await shellEnvironment(launch.cwd);
  const shell = process.env.SHELL ?? '/bin/sh';
  const token = terminalOwnerToken(launch.id);

  const child = spawn(
    launch.shell ? '/bin/sh' : shell,
    launch.shell
      ? [
          '-c',
          `exec ${ptyOwnerDescriptor}<"$2"; "$1" -il; exit $?`,
          token,
          shell,
          launch.shell.outputPath,
        ]
      : ['-l', '-c', launch.command, token],
    {
      cwd: launch.cwd,
      env: { ...base, ...launch.env, TERM: 'xterm-256color' },
      name: 'xterm-256color',
      cols: terminalColumns,
      rows: terminalRows,
    },
  );

  return new PtyTerminal(
    child,
    launch.shell ? { token, ...launch.shell } : { port: launch.port },
  );
};
