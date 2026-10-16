import type {
  AgentAuthTerminalFrame,
  AgentLoginTerminalInput,
} from '@repo/contracts';
import type {
  AgentLaunch,
  LaunchLoginTerminal,
  LoginTerminalProcess,
} from '../agent-launch';
import { terminalAuthSuccessPatterns } from '../vendor';
import { launchAuthTerminal } from './pty';

type TerminalRun = {
  launch: AgentLaunch;
  methodId: string;
  signal: AbortSignal;
};

const patternPollMs = 1000;

export class AuthTerminal {
  private output = '';
  private child?: LoginTerminalProcess;
  private closed = false;
  private exitCode?: number;
  private timer?: ReturnType<typeof setInterval>;
  public constructor(
    private readonly launcher: LaunchLoginTerminal = launchAuthTerminal,
  ) {}
  public async run(input: TerminalRun): Promise<void> {
    input.signal.throwIfAborted();

    try {
      this.child = await this.launcher(input.launch, (text) => {
        this.output += text;
      });
      await this.wait(input);
    } finally {
      clearInterval(this.timer);
      await this.child?.close();
      this.closed = true;
    }
  }
  private async wait({ methodId, signal }: TerminalRun): Promise<void> {
    const abort = (): void => {
      void this.child?.close();
    };

    signal.addEventListener('abort', abort, { once: true });

    try {
      signal.throwIfAborted();

      const result = await this.waitForResult(methodId);

      signal.throwIfAborted();
      this.finish(result);
    } finally {
      signal.removeEventListener('abort', abort);
    }
  }
  private waitForResult(
    methodId: string,
  ): Promise<'matched' | { exitCode: number; signal?: number }> {
    return Promise.race([
      this.requireChild().exited,
      this.matchOutput(methodId),
    ]);
  }
  private matchOutput(methodId: string): Promise<'matched'> {
    const patterns = terminalAuthSuccessPatterns(methodId);

    return new Promise((resolve) => {
      if (patterns.length)
        this.timer = setInterval(() => {
          if (patterns.some((pattern) => this.output.includes(pattern)))
            resolve('matched');
        }, patternPollMs);
    });
  }
  private finish(
    result: 'matched' | { exitCode: number; signal?: number },
  ): void {
    if (result === 'matched') return;
    this.exitCode = result.exitCode;

    if (!terminalSucceeded(result))
      throw new Error(
        `Login command failed with exit code: ${result.exitCode}`,
      );
  }
  public read(cursor: number): AgentAuthTerminalFrame {
    if (cursor > this.output.length) throw new Error('Invalid terminal cursor');

    const frame: AgentAuthTerminalFrame = {
      cursor: this.output.length,
      output: this.output.slice(cursor),
      closed: this.closed,
    };

    if (this.exitCode !== undefined) frame.exitCode = this.exitCode;

    return frame;
  }
  public input(input: AgentLoginTerminalInput): void {
    const child = this.requireChild();

    switch (input.type) {
      case 'write':
        child.write(input.text);
        break;
      case 'resize':
        child.resize(input.cols, input.rows);
    }
  }
  private requireChild(): LoginTerminalProcess {
    if (!this.child || this.closed)
      throw new Error('Sign-in terminal is not running');

    return this.child;
  }
}

const terminalSucceeded = (result: {
  exitCode: number;
  signal?: number;
}): boolean => result.exitCode === 0 && !result.signal;
