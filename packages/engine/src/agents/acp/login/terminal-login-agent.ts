import type { AgentLoginTerminalInput } from '@repo/contracts';
import type {
  AgentLaunchSubject,
  LoginAgentCallbacks,
  LoginAgentConnection,
  OpenLoginAgent,
} from '../..';
import { ResourceCleanupError } from '../../../lib/resource-cleanup-error';
import { AuthTerminal, terminalMethodLaunch } from '../../auth/terminal-auth';
import type { AuthenticationMethod } from '../auth-methods';
import { launchLoginTerminal } from '../login-terminal/terminal-process';
import type { AcpResourceInput } from '../resources/resource-types';
import { createProtocolLoginAgentOpener } from './protocol-login-agent';

class TerminalLoginConnection {
  private readonly lifetime = new AbortController();
  private readonly callbacks: LoginAgentCallbacks;
  private connection?: LoginAgentConnection;
  private pending?: Promise<void>;
  private closing?: Promise<void>;
  private readonly terminal: AuthTerminal;
  private readonly abort = (): void => {
    void this.close().catch(() => {});
  };
  public constructor(
    private readonly subject: AgentLaunchSubject,
    private readonly originalCallbacks: LoginAgentCallbacks,
    private readonly input: AcpResourceInput,
  ) {
    this.callbacks = { ...originalCallbacks, signal: this.lifetime.signal };
    this.terminal = new AuthTerminal(
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
    this.pending =
      method.type === 'terminal'
        ? this.runTerminal(method)
        : this.requireConnection().authenticate(methodId);

    return this.pending;
  }
  private async runTerminal(method: AuthenticationMethod): Promise<void> {
    const launch = terminalMethodLaunch(this.subject.launch, method);
    this.callbacks.reserveTerminalAuthentication?.(launch);
    await this.requireConnection().close();
    this.connection = undefined;
    await this.terminal.run({
      launch,
      methodId: method.id,
      signal: this.callbacks.signal,
    });
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
    await this.pending?.catch((cause: unknown) =>
      cause instanceof ResourceCleanupError ? cause.awaitCleanup() : undefined,
    );
    await this.connection?.close();
  }
}

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
