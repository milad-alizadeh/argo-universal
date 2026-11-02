import { setTimeout } from 'node:timers/promises';
import { AdapterTaskOutput } from './adapter-task-output';
import { createShellOutput, removeShellOutput } from './files';
import { ShellCapture, type ShellCaptureInput } from './shell-capture';

const readInterval = 250;

// How many reads a reported end waits for the task file's exit line, which can land just after it.
const exitLineReads = 4;

// One background command of an Agent that runs its own terminals.
export class AdapterShell {
  private readonly capture: ShellCapture;
  private task?: AdapterTaskOutput;
  private timer?: NodeJS.Timeout;
  private reading: Promise<void>;
  private ended?: Promise<void>;
  public constructor(private readonly input: ShellCaptureInput) {
    this.capture = new ShellCapture(input);
    this.reading = createShellOutput(input.path)
      .then(() => this.capture.associate(input.id))
      .catch(input.failed);
  }
  public follow(path: string): void {
    if (this.task || this.ended) return;

    this.task = new AdapterTaskOutput(path, (chunk) =>
      this.capture.append(chunk),
    );
    this.timer = setInterval(() => this.poll(), readInterval);
    this.timer.unref();
    this.poll();
  }
  private poll(): void {
    this.reading = this.reading
      .then(() => this.task?.read())
      .then(() => this.endAtExitLine())
      .catch(this.input.failed);
  }
  private endAtExitLine(): void {
    if (this.task?.exitCode !== undefined) void this.end();
  }
  // The Agent reports no exit code, so it comes from the task file when that says.
  public end(): Promise<void> {
    this.ended ??= this.finish('exited');

    return this.ended;
  }
  public async close(status: 'lost' | 'stopped'): Promise<void> {
    this.ended ??= this.finish(status);
    await this.ended;
    await removeShellOutput(this.input.path);
  }
  private async finish(status: 'exited' | 'lost' | 'stopped'): Promise<void> {
    clearInterval(this.timer);
    await this.reading;
    await this.readLast(status);
    await this.capture.end(status, { exitCode: this.task?.exitCode });
  }
  private async readLast(status: 'exited' | 'lost' | 'stopped'): Promise<void> {
    if (!this.task) return;

    await (status === 'exited'
      ? this.readExitLine(this.task)
      : this.task.read());
  }
  private async readExitLine(task: AdapterTaskOutput): Promise<void> {
    for (let read = 0; read < exitLineReads; read += 1) {
      await task.read();

      if (task.exitCode !== undefined) return;

      await setTimeout(readInterval);
    }
  }
}
