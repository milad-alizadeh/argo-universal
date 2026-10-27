import type {
  TerminalExitStatus,
  TerminalOutputResponse,
} from '@agentclientprotocol/sdk';
import { awaitAcpOpening, type AgentLaunch } from '../../agents';
import { createShellOutput, removeShellOutput } from './files';
import { ShellCapture, type ShellCaptureInput } from './shell-capture';
import type { ShellCommand, ShellLauncher } from './shell-command';
import { readShellPreview } from './shell-preview-file';

type TerminalInput = ShellCaptureInput & {
  launch: AgentLaunch;
  launchCommand: ShellLauncher;
  home: string;
};

export class ShellTerminal {
  private command?: ShellCommand;
  private readonly capture: ShellCapture;
  private starting?: Promise<void>;
  private closing?: Promise<void>;
  private exit?: TerminalExitStatus;
  private ending?: 'lost' | 'stopped';
  private stopped = false;
  private released = false;
  public constructor(private readonly input: TerminalInput) {
    this.capture = new ShellCapture(input);
  }
  public start(): Promise<void> {
    this.starting ??= this.launch();

    return this.starting;
  }
  private async launch(): Promise<void> {
    await createShellOutput(this.input.path);
    this.command = await this.input.launchCommand({
      ...this.input,
      output: (chunk) => this.capture.append(chunk),
    });
    void this.command.exited
      .then((exit) => this.exited(exit))
      .catch(this.input.failed);
  }
  public associate(toolCallId: string): void {
    this.capture.associate(toolCallId);
  }
  private exited(exit: TerminalExitStatus): Promise<void> {
    this.exit = exit;

    return this.capture.end(
      this.ending ?? this.exitStatus(),
      this.ending ? {} : exit,
    );
  }
  private exitStatus(): 'stopped' | 'exited' {
    return this.stopped ? 'stopped' : 'exited';
  }
  public canStop(): boolean {
    if (!this.command) return false;

    return this.isAvailable() && this.command.isRunning();
  }
  public kill(): void {
    this.requireAvailable();

    if (!this.command) return;

    this.stopped = this.stopped || this.command.kill();
  }
  private isAvailable(): boolean {
    return !this.released && !this.ending;
  }
  private requireAvailable(): void {
    if (!this.isAvailable()) throw new Error('ACP terminal is unavailable');
  }
  public async wait(signal?: AbortSignal): Promise<TerminalExitStatus> {
    this.requireAvailable();

    if (!this.command) throw new Error('ACP terminal has not started');

    signal?.throwIfAborted();
    const exit = await awaitAcpOpening(this.command.exited, signal);
    await this.capture.drain();

    return exit;
  }
  public async output(): Promise<TerminalOutputResponse> {
    this.requireAvailable();
    await this.capture.drain();

    return {
      ...(await readShellPreview(
        this.input.path,
        this.input.request.outputByteLimit,
      )),
      exitStatus: this.exit,
    };
  }
  public async release(): Promise<void> {
    this.kill();
    await this.command?.exited;
    await this.capture.drain();
    this.released = true;
  }
  public close(status: 'lost' | 'stopped'): Promise<void> {
    this.closing ??= this.closeCommand(status);

    return this.closing;
  }
  private async finishStarting(): Promise<void> {
    try {
      await this.starting;
    } catch {}
  }
  private async killCommand(): Promise<void> {
    if (!this.command) return;
    this.command.kill();
    await this.command.exited;
  }
  private async closeCommand(status: 'lost' | 'stopped'): Promise<void> {
    if (!this.exit) this.ending = status;
    await this.finishStarting();
    await this.killCommand();
    await this.capture.drain();
    await removeShellOutput(this.input.path);
    this.released = true;
  }
}
