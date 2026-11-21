import { appendRunOutput } from './run-output';
import { RunScreen } from './run-screen';
import { terminalColumns, terminalRows } from './terminal';

export class TerminalRecording {
  public readonly screen = new RunScreen(terminalColumns, terminalRows);
  private pending: Promise<void> = Promise.resolve();
  private sealed = false;
  private failed = false;

  public constructor(
    public readonly path: string,
    private readonly onFailure: (error: Error) => void,
  ) {}

  public append(data: string): void {
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
