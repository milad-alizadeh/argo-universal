import type {
  CreateTerminalRequest,
  SessionNotification,
  CreateTerminalResponse,
} from '@agentclientprotocol/sdk';
import type { ShellRecord } from '@repo/contracts';
import type { AgentLaunch, TerminalRequests } from '../../agents';
import type { WriterActorRef } from '../../storage';
import type { SessionData } from '../session-data';
import { shellOutputPath } from '../shells/files';
import type { ShellCaptureInput } from './shell-capture';
import { ShellTerminal } from './shell-terminal';
import { terminalReferences } from './shells';

type ShellRuntimeInput = {
  sessionId: string;
  home: string;
  writer: () => WriterActorRef | undefined;
  now: () => number;
  createId: () => string;
  changed: (record: ShellRecord) => void;
  failed: (error: Error) => void;
};

export class ShellRuntime {
  private readonly terminals = new Map<string, ShellTerminal>();
  private launch?: AgentLaunch;
  private cwd = '';
  private closed = false;
  public constructor(private readonly input: ShellRuntimeInput) {}
  public configure(session: SessionData, launch: AgentLaunch): void {
    this.launch = launch;
    this.cwd = session.checkout.path;
  }
  public requests(): TerminalRequests {
    return {
      'terminal/create': ({ params }) => this.create(params),
      'terminal/output': ({ params }) =>
        this.requireTerminal(params.terminalId).output(),
      'terminal/kill': ({ params }) =>
        this.requireTerminal(params.terminalId).kill(),
      'terminal/wait_for_exit': ({ params, signal }) =>
        this.requireTerminal(params.terminalId).wait(signal),
      'terminal/release': ({ params }) =>
        this.requireTerminal(params.terminalId).release(),
    };
  }
  private async create(
    request: Parameters<TerminalRequests['terminal/create']>[0]['params'],
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
  public associate(notification: SessionNotification): void {
    if (this.closed) return;
    const update = notification.update;

    for (const reference of terminalReferences(update))
      this.associateTerminal(reference);
  }
  private associateTerminal(reference: {
    toolCallId: string;
    terminalId: string;
  }): void {
    this.terminals.get(reference.terminalId)?.associate(reference.toolCallId);
  }
  private createTerminal(
    id: string,
    request: CreateTerminalRequest,
  ): ShellTerminal {
    return new ShellTerminal({
      ...this.captureInput(id, request),
      home: this.input.home,
      launch: this.requireLaunch(),
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
      writer: this.requireWriter(),
      cwd: this.cwd,
      path: this.outputPath(id),
    };
  }
  private requireWriter(): WriterActorRef {
    const writer = this.input.writer();

    if (!writer) throw new Error('Shell Writer is unavailable');

    return writer;
  }
  private outputPath(id: string): string {
    return shellOutputPath(this.input.home, this.input.sessionId, id);
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
  private requireTerminal(id: string): ShellTerminal {
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
    await Promise.all(
      [...this.terminals.values()].map((terminal) => terminal.close(status)),
    );
  }
}
