import type {
  CreateTerminalRequest,
  CreateTerminalResponse,
} from '@agentclientprotocol/sdk';
import type { ShellRecord } from '@repo/contracts';
import type { AcpSessionDestination, AgentLaunch } from '../../agents';
import type { WriterActorRef } from '../../storage';
import type { SessionData, SessionInput } from '../session-data';
import { shellOutputPath } from './files';
import { attachShellRuntime } from './shell-acp';
import type { ShellCaptureInput } from './shell-capture';
import type { ShellLauncher } from './shell-command';
import { launchShellCommand } from './shell-launch';
import { ShellTerminal } from './shell-terminal';
import type { Shells } from './shells';

// The Session the Shells belong to, as its machine input names it.
export type ShellSession = Pick<
  SessionInput,
  'sessionId' | 'runtimeDirectory'
> & {
  writer: WriterActorRef;
  now: () => number;
  createId: () => string;
};

// How the Shells report back to their Session.
export type ShellReports = {
  changed: (record: ShellRecord) => void;
  failed: (error: Error) => void;
  // How a command starts; tests substitute one that runs nothing.
  launch?: ShellLauncher;
};

export type ShellRuntimeInput = ShellSession & ShellReports;

export class ShellRuntime implements Shells {
  private readonly terminals = new Map<string, ShellTerminal>();
  private launch?: AgentLaunch;
  private cwd = '';
  private closed = false;
  public constructor(private readonly input: ShellRuntimeInput) {}
  public configure(session: SessionData, launch: AgentLaunch): void {
    this.launch = launch;
    this.cwd = session.checkout.path;
  }
  public attach(destination: AcpSessionDestination): AcpSessionDestination {
    return attachShellRuntime(this, destination);
  }
  public async create(
    request: CreateTerminalRequest,
  ): Promise<CreateTerminalResponse> {
    const id = this.input.createId();
    const terminal = this.createTerminal(id, request);
    this.terminals.set(id, terminal);
    await this.startTerminal(id, terminal);

    await this.finishLaunch(terminal);

    return { terminalId: id };
  }
  private async startTerminal(
    id: string,
    terminal: ShellTerminal,
  ): Promise<void> {
    try {
      await terminal.start();
    } catch (error) {
      this.terminals.delete(id);
      await terminal.close('lost');
      throw error;
    }
  }
  public associate(terminalId: string, toolCallId: string): void {
    if (!this.closed) this.terminals.get(terminalId)?.associate(toolCallId);
  }
  private createTerminal(
    id: string,
    request: CreateTerminalRequest,
  ): ShellTerminal {
    return new ShellTerminal({
      ...this.captureInput(id, request),
      home: this.input.runtimeDirectory,
      launch: this.requireLaunch(),
      launchCommand: this.input.launch ?? launchShellCommand,
    });
  }
  private captureInput(
    id: string,
    request: CreateTerminalRequest,
  ): ShellCaptureInput {
    return {
      ...this.input,
      id,
      request,
      cwd: this.cwd,
      path: this.outputPath(id),
    };
  }
  private outputPath(id: string): string {
    return shellOutputPath(
      this.input.runtimeDirectory,
      this.input.sessionId,
      id,
    );
  }
  private requireLaunch(): AgentLaunch {
    if (this.closed || !this.launch)
      throw new Error('Shell runtime is unavailable');

    return this.launch;
  }
  private async finishLaunch(terminal: ShellTerminal): Promise<void> {
    if (!this.closed) return;
    await terminal.close('lost');
    throw new Error('Shell runtime closed during launch');
  }
  public requireTerminal(id: string): ShellTerminal {
    const terminal = this.terminals.get(id);

    if (!terminal || this.closed) throw new Error('Unknown ACP terminal');

    return terminal;
  }
  public canStop(id: string): boolean {
    const terminal = this.terminals.get(id);

    if (!terminal || this.closed) return false;

    return terminal.canStop();
  }
  public stop(id: string): void {
    this.requireTerminal(id).kill();
  }
  public async close(status: 'lost' | 'stopped'): Promise<void> {
    this.closed = true;

    const closed = await Promise.allSettled(
      [...this.terminals.values()].map((terminal) => terminal.close(status)),
    );

    const failure = closed.find((result) => result.status === 'rejected');

    if (failure) throw failure.reason;
  }
}
