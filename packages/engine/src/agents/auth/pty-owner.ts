import type { IPty } from 'node-pty';
import type { LoginTerminalProcess } from '../agent-launch';

const closeGraceMs = 250;

class AuthPty implements LoginTerminalProcess {
  private finished = false;
  private closing?: Promise<void>;
  public readonly exited: LoginTerminalProcess['exited'];
  public constructor(private readonly child: IPty) {
    this.exited = new Promise((resolve) =>
      child.onExit((result) => {
        this.finished = true;
        resolve(result);
      }),
    );
  }
  public write(text: string): void {
    this.child.write(text);
  }
  public resize(cols: number, rows: number): void {
    this.child.resize(cols, rows);
  }
  public close(): Promise<void> {
    this.closing ??= this.stop();

    return this.closing;
  }
  private kill(signal?: string): void {
    if (!this.finished) this.child.kill(signal);
  }
  private async stop(): Promise<void> {
    this.kill();
    const timer = setTimeout(() => this.kill('SIGKILL'), closeGraceMs);

    try {
      await this.exited;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const ownAuthTerminal = (child: IPty): LoginTerminalProcess =>
  new AuthPty(child);
