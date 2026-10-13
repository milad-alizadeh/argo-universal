import type { AgentLoginTerminalInput } from '@repo/contracts';
import type {
  AgentLaunchSubject,
  LoginAgentCallbacks,
  LoginAgentConnection,
  OpenLoginAgent,
} from '../agents';
import { ResourceCleanupError } from '../lib/resource-cleanup-error';
import { LoginTerminal } from './login-terminal';
import { createProtocolLoginAgentOpener } from './protocol-login-agent';
import type { AcpResourceInput } from './resource-types';
import { launchLoginTerminal } from './terminal-process';

class TerminalLoginConnection {
  private readonly lifetime = new AbortController();
  private readonly callbacks: LoginAgentCallbacks;
  private connection?: LoginAgentConnection;
  private pending?: Promise<void>;
  private closing?: Promise<void>;
  private readonly terminal: LoginTerminal;
  private readonly abort = (): void => {
    void this.close().catch(() => {});
  };
  public constructor(
    private readonly subject: AgentLaunchSubject,
    private readonly originalCallbacks: LoginAgentCallbacks,
    private readonly input: AcpResourceInput,
  ) {
    this.callbacks = { ...originalCallbacks, signal: this.lifetime.signal };
    this.terminal = new LoginTerminal(
      input.launchLoginTerminal ?? launchLoginTerminal,
    );
    originalCallbacks.signal.addEventListener('abort', this.abort, {
      once: true,
    });
  }
  public async open(): Promise<LoginAgentConnection> {
    this.connection = await this.openProtocol();
    return {
      methods: this.connection.methods,
      authenticate: (methodId) => this.authenticate(methodId),
      checkReady: () => this.requireConnection().checkReady(),
      close: () => this.close(),
      terminalActive: () => this.terminal.active(),
      readTerminal: (cursor) => this.terminal.read(cursor),
      inputTerminal: (input) => this.inputTerminal(input),
    };
  }
  private openProtocol(): Promise<LoginAgentConnection> {
    this.callbacks.signal.throwIfAborted();
    return createProtocolLoginAgentOpener({
      ...this.input,
      terminalSupported:
        this.input.launchLoginTerminal !== undefined ||
        process.platform !== 'win32',
    })(this.subject, this.callbacks);
  }
  private requireConnection(): LoginAgentConnection {
    if (!this.connection) throw new Error('Login connection is missing');
    return this.connection;
  }
  private async authenticate(methodId: string): Promise<void> {
    this.callbacks.signal.throwIfAborted();
    const method = this.requireConnection().methods.find(
      (entry) => entry.id === methodId,
    );
    if (!method) throw new Error('Authentication method is not supported');
    this.pending = method.terminal
      ? this.runTerminal(method.terminal)
      : this.requireConnection().authenticate(methodId);
    return this.pending;
  }
  private async runTerminal(
    terminal: NonNullable<LoginAgentConnection['methods'][number]['terminal']>,
  ): Promise<void> {
    const launch = terminalLaunch(this.subject, terminal);
    this.callbacks.reserveTerminalAuthentication?.(launch);
    await this.requireConnection().close();
    this.connection = undefined;
    await this.terminal.run(launch, this.callbacks.signal);
    this.connection = await this.openProtocol();
  }
  private inputTerminal(input: AgentLoginTerminalInput): void {
    this.callbacks.signal.throwIfAborted();
    if (this.closing) throw new Error('Login is closed');
    this.terminal.input(input);
  }
  public close(): Promise<void> {
    this.lifetime.abort();
    this.closing ??= this.release();
    return this.closing;
  }
  private async release(): Promise<void> {
    this.originalCallbacks.signal.removeEventListener('abort', this.abort);
    await this.terminal.close();
    await this.pending?.catch((error: unknown) =>
      error instanceof ResourceCleanupError ? error.awaitCleanup() : undefined,
    );
    await this.connection?.close();
  }
}
const terminalLaunch = (
  subject: AgentLaunchSubject,
  terminal: NonNullable<LoginAgentConnection['methods'][number]['terminal']>,
): AgentLaunchSubject['launch'] => ({
  ...subject.launch,
  args: [...subject.launch.args, ...terminal.args],
  env: { ...subject.launch.env, ...terminal.env },
});
export const createLoginAgentOpener =
  (input: AcpResourceInput = {}): OpenLoginAgent =>
  async (subject, callbacks) => {
    callbacks.signal.throwIfAborted();
    const connection = new TerminalLoginConnection(subject, callbacks, input);
    try {
      return await connection.open();
    } catch (error) {
      await connection.close();
      throw error;
    }
  };
