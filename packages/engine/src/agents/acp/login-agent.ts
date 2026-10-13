import type {
  ClientConnection,
  InitializeResponse,
  SessionNotification,
} from '@agentclientprotocol/sdk';
import { createRejectionCounter } from '@repo/machine-log';
import type {
  LoginAgentCallbacks,
  LoginAgentConnection,
  LoginAgentMethod,
  LoginAgentOutcome,
} from '..';
import { ResourceCleanupError } from '../../lib/resource-cleanup-error';
import { AcpAuthenticationStatus } from './auth-status';
import { createAgentClient } from './client';
import { negotiateAcpInitialize } from './initialize';
import { closeLoginProcess } from './login-cleanup';
import { loginElicitation } from './login-elicitation';
import { loginMethods } from './login-methods';
import { AcpLoginWire } from './login-wire';
import type { AcpProcess } from './resource-types';
import { createAcpResponseReaders } from './response-readers';

type LoginInput = {
  process: AcpProcess;
  callbacks: LoginAgentCallbacks;
  closeTimeoutMs?: number;
  terminalSupported?: boolean;
};
const updateRejections = createRejectionCounter('ACP login updates');
const rejectLoginUpdate = (notification: SessionNotification): undefined => {
  updateRejections.report(
    'Rejected login Session update',
    new Error(`No login Session owns ${notification.sessionId}`),
  );
};

export class AcpLoginConnection {
  private readonly wire = new AcpLoginWire();
  private readonly status = new AcpAuthenticationStatus();
  private readonly readers = createAcpResponseReaders(
    createRejectionCounter('ACP login responses'),
  );
  private readonly connection: ClientConnection;
  private methods: readonly LoginAgentMethod[] = [];
  private initialization: InitializeResponse | undefined;
  private closing: Promise<void> | undefined;
  private readonly abort = (): void => {
    void this.close().catch(() => {});
  };
  public constructor(private readonly input: LoginInput) {
    this.connection = createAgentClient({
      stream: this.wire.observe(input.process.stream),
      acceptSessionUpdate: rejectLoginUpdate,
      requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
      createElicitation: loginElicitation(this.wire, input.callbacks),
      acceptAuthStatus: (notification) => this.status.accept(notification),
      rejectAuthStatus: () => this.status.invalidate(),
    });
    input.callbacks.signal.addEventListener('abort', this.abort, {
      once: true,
    });
    if (input.callbacks.signal.aborted) this.abort();
  }
  public async initialize(): Promise<LoginAgentConnection> {
    this.initialization = await negotiateAcpInitialize(
      this.connection.agent,
      this.readers,
      { elicitation: { url: {} }, terminalAuth: this.input.terminalSupported },
    );
    this.methods = this.offeredMethods();
    return {
      methods: this.methods,
      authenticate: (methodId) => this.authenticate(methodId),
      checkReady: () => this.checkReady(),
      close: () => this.close(),
    };
  }
  private offeredMethods(): readonly LoginAgentMethod[] {
    if (!this.initialization) return [];
    return loginMethods(this.initialization, this.input.terminalSupported);
  }
  private requireMethod(methodId: string): void {
    this.input.callbacks.signal.throwIfAborted();
    if (this.closing) throw new Error('Login connection is closed');
    if (!this.methods.some((method) => method.id === methodId))
      throw new Error('Authentication method is not supported');
  }
  private async dispatchAuthenticate(methodId: string): Promise<void> {
    this.readers.authenticate.parse(
      await this.connection.agent.request<unknown>(
        'authenticate',
        { methodId },
        { cancellationSignal: this.input.callbacks.signal },
      ),
    );
    this.input.callbacks.signal.throwIfAborted();
  }
  private async authenticate(methodId: string): Promise<void> {
    this.requireMethod(methodId);
    try {
      await this.dispatchAuthenticate(methodId);
    } finally {
      this.wire.forget();
    }
  }
  public checkReady(): Promise<LoginAgentOutcome> {
    if (!this.initialization)
      throw new Error('Agent initialization is unavailable');
    return this.status.check(this.initialization);
  }
  public close(): Promise<void> {
    this.closing ??= this.terminate();
    return this.closing;
  }
  private async terminate(): Promise<void> {
    this.input.callbacks.signal.removeEventListener('abort', this.abort);
    this.wire.forget();
    this.connection.close();
    await closeLoginProcess(this.input.process, this.input.closeTimeoutMs);
  }
}

export const initializeOrClose = async (
  connection: AcpLoginConnection,
): Promise<LoginAgentConnection> => {
  try {
    return await connection.initialize();
  } catch (error) {
    const cleanup = connection.close();
    await cleanup.catch((cause: unknown) => {
      throw new ResourceCleanupError(cleanup, cause);
    });
    throw error;
  }
};
