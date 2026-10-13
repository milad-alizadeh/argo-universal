import type {
  AgentLoginTerminalFrame,
  AgentLoginTerminalInput,
} from '@repo/contracts';
import { loginTerminalOutputLimit } from '@repo/contracts';
import type {
  AgentLaunch,
  LoginTerminalProcess,
  LaunchLoginTerminal,
} from '..';
import { ResourceCleanupError } from '../../lib/resource-cleanup-error';

export class LoginTerminal {
  private output = '';
  private child?: LoginTerminalProcess;
  private opening?: Promise<void>;
  private failure?: Error;
  private finishing = false;
  public constructor(private readonly launch: LaunchLoginTerminal) {}
  public async run(launch: AgentLaunch, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    this.opening = this.open(launch);
    await this.opening;
    signal.throwIfAborted();
    const result = await this.requireChild().exited;
    this.finishing = true;
    await this.closeChild();
    signal.throwIfAborted();

    if (this.failure) throw this.failure;

    if (terminalFailed(result))
      throw new Error(
        'The sign-in terminal exited without completing sign-in.',
      );
  }
  public active(): boolean {
    return !!this.child && !this.finishing;
  }
  public read(cursor: number): AgentLoginTerminalFrame {
    if (cursor > this.output.length) throw new Error('Invalid terminal cursor');

    return { cursor: this.output.length, output: this.output.slice(cursor) };
  }
  public input(input: AgentLoginTerminalInput): void {
    const child = this.requireChild();

    if (input.type === 'write') child.write(input.text);
    else child.resize(input.cols, input.rows);
  }
  public async close(): Promise<void> {
    await this.opening?.catch((cause: unknown) =>
      cause instanceof ResourceCleanupError ? cause.awaitCleanup() : undefined,
    );
    this.output = '';
    await this.closeChild();
  }
  private async open(launch: AgentLaunch): Promise<void> {
    this.child = await this.launch(launch, (text) => this.append(text));

    if (this.failure) await this.closeChild();
  }
  private append(text: string): void {
    if (this.failure) return;

    if (this.output.length + text.length > loginTerminalOutputLimit) {
      this.failure = new Error(
        'The sign-in terminal exceeded its output limit.',
      );
      void this.closeChild().catch(() => {});

      return;
    }

    this.output += text;
  }
  private requireChild(): LoginTerminalProcess {
    if (!this.child) throw new Error('The sign-in terminal is not running');

    return this.child;
  }
  private async closeChild(): Promise<void> {
    const child = this.child;

    if (!child) return;
    await child.close();
    this.child = undefined;
  }
}

const terminalFailed = (result: {
  exitCode: number;
  signal?: number;
}): boolean => result.exitCode !== 0 || !!result.signal;
