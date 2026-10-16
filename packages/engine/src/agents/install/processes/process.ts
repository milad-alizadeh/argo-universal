import type { ChildProcess, Serializable } from 'node:child_process';
import type { InstallToolInput } from '../ports';
import {
  cleanExitedInstallProcess,
  cleanInstallProcess,
  InstallCleanupError,
} from './process-cleanup';
import {
  InstallOutput,
  cleanDiagnostic,
  outputFailure,
} from './process-output';
import { removeInstallerRecord } from './process-record';
import { readInstallerExitCode, spawnInstallWrapper } from './process-wrapper';

const diagnosticLimit = 8192;

const missingToolExitCode = 127;

class InstallProcess {
  private readonly output: InstallOutput;
  private failure: Error | undefined;
  private diagnostic = '';
  private toolExitCode: number | null | undefined;

  private cleanup: Promise<void> | undefined;
  private readonly result = Promise.withResolvers<string>();
  public constructor(
    private readonly child: ChildProcess,
    private readonly input: InstallToolInput,
  ) {
    this.output = new InstallOutput(input);
    this.attachOutput();
    this.attachLifecycle();
    input.signal.addEventListener('abort', this.abort, { once: true });

    if (input.signal.aborted) this.abort();
  }
  private attachLifecycle(): void {
    this.child.once('error', () => {
      this.failure = new Error(
        `${this.input.executable} is required on the Server`,
      );
    });
    this.child.once('close', (code) => {
      void this.closed(code);
    });
    this.child.once('exit', this.exited);
    this.child.once('message', this.completed);
  }
  private attachOutput(): void {
    this.child.stdout?.on('data', (chunk: Buffer) => this.acceptOutput(chunk));
    this.child.stderr?.on('data', (chunk: Buffer) => {
      this.diagnostic = `${this.diagnostic}${chunk.toString()}`.slice(
        -diagnosticLimit,
      );
    });
  }
  public wait(): Promise<string> {
    return this.result.promise;
  }
  private acceptOutput(chunk: Buffer): void {
    if (this.failure) return;

    try {
      this.output.accept(chunk);
    } catch (error) {
      this.failure = outputFailure(error);
      this.abort();
    }
  }
  private abort = (): void => {
    this.cleanup ??= cleanInstallProcess(this.child);
    this.observeCleanup();
  };
  private exited = (): void => {
    this.cleanup ??= cleanExitedInstallProcess(this.child);
    this.observeCleanup();
  };
  private completed = (message: Serializable): void => {
    try {
      this.toolExitCode = readInstallerExitCode(message);
      this.exited();
    } catch (error) {
      this.failure = outputFailure(error);
      this.abort();
    }
  };
  private observeCleanup(): void {
    void this.cleanup?.catch(this.result.reject);
  }
  private async closed(code: number | null): Promise<void> {
    try {
      await this.cleanup;
      await this.settleResult(
        this.toolExitCode === undefined ? code : this.toolExitCode,
      );
    } catch (error) {
      this.result.reject(error);
    } finally {
      this.input.signal.removeEventListener('abort', this.abort);
    }
  }
  private failed(code: number | null): Error | undefined {
    if (this.failure) return this.failure;

    return this.exitFailure(code);
  }
  private exitFailure(code: number | null): Error | undefined {
    if (code === missingToolExitCode)
      return new Error(`${this.input.executable} is required on the Server`);

    return code === 0
      ? undefined
      : new Error(
          `${this.input.executable} failed to install the Agent: ${cleanDiagnostic(this.diagnostic)}`,
        );
  }
  private async settleResult(code: number | null): Promise<void> {
    if (this.input.signal.aborted) {
      this.result.reject(this.input.signal.reason);

      return;
    }

    const failure = this.failed(code);

    if (failure) this.result.reject(failure);
    else this.result.resolve(await this.output.finish());
  }
}

const observeInstaller = async (
  input: InstallToolInput,
  operation: Promise<string>,
): Promise<string> => {
  try {
    const result = await operation;
    await removeInstallerRecord(input.cwd);

    return result;
  } catch (error) {
    if (!(error instanceof InstallCleanupError))
      await removeInstallerRecord(input.cwd);
    throw error;
  }
};

export const runInstallTool = async (
  input: InstallToolInput,
): Promise<string> => {
  input.signal.throwIfAborted();

  if (process.platform === 'win32')
    throw new Error('Managed Agent installation is unsupported on Windows');
  const child = await spawnInstallWrapper(input);
  const operation = new InstallProcess(child, input).wait();

  if (!input.signal.aborted) child.send('launch');

  return observeInstaller(input, operation);
};
