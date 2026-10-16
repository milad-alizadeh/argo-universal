import { spawn, type ChildProcess } from 'node:child_process';
import type { InstallToolInput } from '../ports';
import {
  InstallOutput,
  cleanDiagnostic,
  outputFailure,
} from './process-output';

const diagnosticLimit = 8192;

const exitGraceMs = 1000;

class LaunchTool {
  private readonly output: InstallOutput;
  private diagnostic = '';
  private failure?: Error;
  private escalation?: ReturnType<typeof setTimeout>;
  private readonly result = Promise.withResolvers<string>();
  public constructor(
    private readonly child: ChildProcess,
    private readonly input: InstallToolInput,
  ) {
    this.output = new InstallOutput(input);
    this.attachOutput();
    this.attachLifecycle();
    input.signal.addEventListener('abort', this.stop, { once: true });

    if (input.signal.aborted) this.stop();
  }
  public wait(): Promise<string> {
    return this.result.promise;
  }
  private attachOutput(): void {
    this.child.stdout?.on('data', (chunk: Buffer) => this.accept(chunk));
    this.child.stderr?.on('data', (chunk: Buffer) => {
      this.diagnostic = `${this.diagnostic}${chunk.toString()}`.slice(
        -diagnosticLimit,
      );
    });
  }
  private accept(chunk: Buffer): void {
    if (this.failure) return;

    try {
      this.output.accept(chunk);
    } catch (cause) {
      this.failure = outputFailure(cause);
      this.stop();
    }
  }
  private attachLifecycle(): void {
    this.child.once('error', () => {
      this.failure = new Error(
        `${this.input.executable} is required on the Server`,
      );
    });
    this.child.once('close', (code) => {
      clearTimeout(this.escalation);
      this.input.signal.removeEventListener('abort', this.stop);
      void this.finish(code).then(this.result.resolve, this.result.reject);
    });
  }
  private stop = (): void => {
    this.child.kill('SIGTERM');
    this.escalation ??= setTimeout(
      () => this.child.kill('SIGKILL'),
      exitGraceMs,
    );
  };
  private async finish(code: number | null): Promise<string> {
    this.input.signal.throwIfAborted();

    if (this.failure) throw this.failure;

    if (code !== 0) throw this.exitFailure();

    return this.output.finish();
  }
  private exitFailure(): Error {
    return new Error(
      `${this.input.executable} failed to install the Agent: ${cleanDiagnostic(this.diagnostic)}`,
    );
  }
}

// Tools inherit the Engine's process group, just like Agent processes.
export const runInstallTool = async (
  input: InstallToolInput,
): Promise<string> => {
  input.signal.throwIfAborted();

  const child = spawn(input.executable, [...input.args], {
    cwd: input.cwd,
    env: input.env
      ? { NODE_ENV: process.env.NODE_ENV, ...input.env }
      : undefined,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return new LaunchTool(child, input).wait();
};
