import {
  loginTerminalOutputLimit,
  type AgentAuthTerminalFrame,
  type AgentLoginTerminalInput,
} from '@repo/contracts';
import { launchLoginTerminal } from '../acp/terminal-process';
import type {
  AgentLaunch,
  LaunchLoginTerminal,
  LoginTerminalProcess,
} from '../agent-launch';
import { terminalAuthSuccessPatterns } from '../vendor';

type TerminalRun = {
  launch: AgentLaunch;
  methodId: string;
  signal: AbortSignal;
};

type TerminalResult = 'matched' | { exitCode: number; signal?: number };

const patternPollMs = 1000;

export class AuthTerminal {
  private output = '';
  private child?: LoginTerminalProcess;
  private closed = false;
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
      clearInterval(this.timer);
      await this.child?.close();
      this.closed = true;
    }
  }
  // ADR-0016 finite budgets: the same cap as the login terminal.
  private append(text: string): void {
    if (this.output.length + text.length > loginTerminalOutputLimit) {
      this.overflow.reject(
        new Error('The sign-in terminal exceeded its output limit.'),
      );

      return;
    }

    this.output += text;
  }
  private async wait({ methodId, signal }: TerminalRun): Promise<void> {
    const abort = (): void => {
      void this.child?.close().catch(() => {});
    };

    signal.addEventListener('abort', abort, { once: true });

    try {
      signal.throwIfAborted();
      this.finish(await this.settle(methodId, signal));
    } finally {
      signal.removeEventListener('abort', abort);
    }
  }
  // A cancelled attempt reports the cancellation, not the closed terminal it caused.
  private async settle(
    methodId: string,
    signal: AbortSignal,
  ): Promise<TerminalResult> {
    try {
      return await this.waitForResult(methodId);
    } finally {
      signal.throwIfAborted();
    }
  }
  private waitForResult(methodId: string): Promise<TerminalResult> {
    return Promise.race([
      this.requireChild().exited,
      this.matchOutput(methodId),
      this.overflow.promise,
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
