import { appendRunOutput } from './run-output';
import { RunScreen } from './run-screen';
import { terminalColumns, terminalRows } from './terminal';

export class TerminalRecording {
  public readonly screen = new RunScreen(terminalColumns, terminalRows);
  private pending: Promise<void> = Promise.resolve();

  public constructor(public readonly path: string) {}

  public append(data: string): void {
    this.screen.write(data);
    this.pending = this.pending.then(() =>
      appendRunOutput(this.path, data).catch((): void => undefined),
    );
  }

  public flushed(): Promise<void> {
    return this.pending;
  }

  public async dispose(): Promise<void> {
    await this.flushed();
    await this.screen.dispose();
  }
}
