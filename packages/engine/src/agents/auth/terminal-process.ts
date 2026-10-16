import { spawn, type IPty } from 'node-pty';
import type {
  AgentLaunch,
  LaunchLoginTerminal,
  LoginTerminalProcess,
} from '../agent-launch';

const terminalCols = 80;

const terminalRows = 24;

const exitGraceMs = 1000;

type TerminalExit = Awaited<LoginTerminalProcess['exited']>;

class AuthTerminalProcess {
  private readonly result = Promise.withResolvers<TerminalExit>();
  private closed = false;
  private closing?: Promise<void>;
  public constructor(
    private readonly child: IPty,
    output: (text: string) => void,
  ) {
    const data = child.onData(output);
    child.onExit((result) => {
      this.closed = true;
      data.dispose();
      this.result.resolve(result);
    });
  }
  public port(): LoginTerminalProcess {
    return {
      exited: this.result.promise,
      write: (text) => this.child.write(text),
      resize: (cols, rows) => this.child.resize(cols, rows),
      close: () => this.close(),
    };
  }
  private close(): Promise<void> {
    this.closing ??= this.release();

    return this.closing;
  }
  private async release(): Promise<void> {
    if (this.closed) return;
    this.child.kill();

    const escalation = setTimeout(
      () => this.child.kill('SIGKILL'),
      exitGraceMs,
    );

    try {
      await this.result.promise;
    } finally {
      clearTimeout(escalation);
    }
  }
}

const spawnTerminal = (launch: AgentLaunch): IPty =>
  spawn(launch.executable, [...launch.args], {
    cwd: launch.cwd,
    env: { ...launch.env, TERM: 'xterm-256color' },
    name: 'xterm-256color',
    cols: terminalCols,
    rows: terminalRows,
  });

// node-pty owns the sign-in terminal; closing it hangs up its program.
export const launchLoginTerminal: LaunchLoginTerminal = async (
  launch,
  output,
) => {
  if (process.platform === 'win32')
    throw new Error('Terminal sign-in is unavailable on this Server');

  return new AuthTerminalProcess(spawnTerminal(launch), output).port();
};
