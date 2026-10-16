import {
  loginTerminalOutputLimit,
  type AgentAuthTerminalFrame,
  type AgentLoginTerminalInput,
} from '@repo/contracts';
import type { AuthenticationMethod } from '../acp/auth-methods';
import { launchLoginTerminal } from '../acp/login-terminal/terminal-process';
import type {
  AgentLaunch,
  LaunchLoginTerminal,
  LoginTerminalProcess,
} from '../agent-launch';
import { terminalSuccessPatterns } from '../vendor';

type TerminalRun = {
  launch: AgentLaunch;
  methodId: string;
  signal: AbortSignal;
};

// The full get-command with the method's args appended and its env on top.
export const terminalMethodLaunch = (
  launch: AgentLaunch,
  method: Pick<AuthenticationMethod, 'args' | 'env'>,
): AgentLaunch => ({
  ...launch,
  args: [...launch.args, ...(method.args ?? [])],
  env: { ...launch.env, ...method.env },
});

type TerminalResult = 'matched' | { exitCode: number; signal?: number };

const patternPollMs = 1000;

export class AuthTerminal {
  private output = '';
  private child?: LoginTerminalProcess;
  private closed = false;
  private finishing = false;
  private exitCode?: number;
  private timer?: ReturnType<typeof setInterval>;
  private readonly overflow = Promise.withResolvers<never>();
  public constructor(
    private readonly launcher: LaunchLoginTerminal = launchLoginTerminal,
  ) {
    void this.overflow.promise.catch(() => {});
  }
  public async run(input: TerminalRun): Promise<void> {
    input.signal.throwIfAborted();

    try {
      this.child = await this.launcher(input.launch, (text) =>
        this.append(text),
      );
      await this.wait(input);
    } finally {
      this.finishing = true;
      clearInterval(this.timer);
      await this.child?.close();
      this.closed = true;
    }
  }
  public active(): boolean {
    return !!this.child && !this.finishing;
  }
  // Releases the program even when its caller stopped waiting for it.
  public async close(): Promise<void> {
    await this.child?.close();
  }
  // ADR-0016 finite budgets: output is capped at the frame limit.
  private append(text: string): void {
    if (this.output.length + text.length > loginTerminalOutputLimit) {
      this.overflow.reject(
        new Error('The sign-in terminal exceeded its output limit.'),
      );

      return;
    }

    this.output += text;
  }
  private async wait(run: TerminalRun): Promise<void> {
    const { signal } = run;

    const abort = (): void => {
      void this.child?.close().catch(() => {});
    };

    signal.addEventListener('abort', abort, { once: true });

    try {
      signal.throwIfAborted();
      this.finish(await this.settle(run));
    } finally {
      signal.removeEventListener('abort', abort);
    }
  }
  // A cancelled attempt reports the cancellation, not the closed terminal it caused.
  private async settle(run: TerminalRun): Promise<TerminalResult> {
    try {
      return await this.waitForResult(run);
    } finally {
      run.signal.throwIfAborted();
    }
  }
  private waitForResult({
    launch,
    methodId,
  }: TerminalRun): Promise<TerminalResult> {
    return Promise.race([
      this.requireChild().exited,
      this.matchOutput(terminalSuccessPatterns(launch, methodId)),
      this.overflow.promise,
    ]);
  }
  private matchOutput(patterns: readonly string[]): Promise<'matched'> {
    return new Promise((resolve) => {
      if (patterns.length)
        this.timer = setInterval(() => {
          if (patterns.some((pattern) => this.output.includes(pattern)))
            resolve('matched');
        }, patternPollMs);
    });
  }
  private finish(result: TerminalResult): void {
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
