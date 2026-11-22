import {
  appendRunOutput,
  createRunOutput,
  removeRunOutput,
} from './run-output';
import { RunScreen } from './run-screen';
import {
  terminalColumns,
  terminalRows,
  type TerminalProcess,
} from './terminal';

export class TerminalRecording {
  public readonly screen = new RunScreen(terminalColumns, terminalRows);
  private pending: Promise<void> = Promise.resolve();
  private sealed = false;
  private failed = false;
  private stopping?: Promise<void>;

  private constructor(
    public readonly path: string,
    public readonly process: TerminalProcess,
    private readonly onFailure: (error: Error) => void,
  ) {}

  public static async start(
    path: string,
    spawn: () => TerminalProcess | Promise<TerminalProcess>,
    onFailure: (error: Error) => void,
  ): Promise<TerminalRecording> {
    await createRunOutput(path);

    try {
      return new TerminalRecording(path, await spawn(), onFailure);
    } catch (error) {
      await removeRunOutput(path);
      throw error;
    }
  }

  public watchOutput(
    published: () => void,
    received?: (data: string) => void,
  ): void {
    this.process.onData((data) => {
      this.append(data);
      received?.(data);
      void this.flushed().then(published);
    });
  }

  public stop(): Promise<void> {
    this.stopping ??= Promise.resolve().then(() => this.process.stop());

    return this.stopping;
  }

  private append(data: string): void {
    if (this.sealed) return;
    this.screen.write(data);
    this.pending = this.pending.then(async () => {
      if (this.failed) return;
      await appendRunOutput(this.path, data).catch((error: Error) => {
        this.failed = true;
        this.onFailure(error);
      });
    });
  }

  public flushed(): Promise<void> {
    return this.pending;
  }

  public seal(): Promise<void> {
    this.sealed = true;

    return this.flushed();
  }

  public async dispose(): Promise<void> {
    await this.seal();
    await this.screen.dispose();
  }
}
