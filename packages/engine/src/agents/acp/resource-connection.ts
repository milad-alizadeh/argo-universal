import type {
  ClientConnection,
  ClientContext,
  InitializeResponse,
} from '@agentclientprotocol/sdk';
import { createRejectionCounter } from '@repo/machine-log';
import type { AgentLaunch } from '..';
import { AcpAuthenticationStatus } from './auth-status';
import { createAgentClient } from './client';
import { negotiateAcpInitialize } from './initialize';
import { openProtocolSession } from './open-session';
import { launchAcpProcess } from './process';
import type {
  AcpProcess,
  AcpResourceInput,
  AcpSessionLease,
  AcpSessionOpening,
} from './resource-types';
import { createResourceResponders } from './responders';
import { createAcpResponseReaders } from './response-readers';
import { AcpResponseWrites } from './response-writes';
import type { AcpRouting } from './routing';
import { observeSignInRequired } from './sign-in-required';
import { reportsAuthStatus } from './subscription-status';

type Ready = {
  connection: ClientConnection;
  agent: ClientContext;
  initialization: InitializeResponse;
};

export class AcpResourceConnection {
  private onResourceFailure: ((cause: unknown) => void) | undefined;
  private readonly writes = new AcpResponseWrites((error) =>
    this.onResourceFailure?.(error),
  );
  private readonly readers = createAcpResponseReaders(
    createRejectionCounter('ACP responses'),
  );
  private readonly status = new AcpAuthenticationStatus();
  private readonly process: Promise<AcpProcess>;
  private readonly startup: Promise<Ready>;
  private connection: ClientConnection | undefined;
  private termination: Promise<void> | undefined;
  public constructor(
    private readonly input: AcpResourceInput,
    private readonly routing: AcpRouting,
    launch: AgentLaunch,
  ) {
    this.process = (input.launchProcess ?? launchAcpProcess)(launch);
    this.startup = this.initialize();
    void this.startup.catch(() => {});
  }
  private async initialize(): Promise<Ready> {
    const process = await this.process;
    this.connection = createAgentClient({
      stream: this.writes.observeResponseWrites(process.stream),
      acceptSessionUpdate: this.routing.accept,
      acceptAuthStatus: (notification) => this.status.accept(notification),
      rejectAuthStatus: () => this.status.invalidate(),
      ...createResourceResponders(this.routing, this.writes),
    });

    return this.ready(this.connection);
  }
  private async ready(connection: ClientConnection): Promise<Ready> {
    const agent = observeSignInRequired(connection.agent, () =>
      this.input.onSignInRequired?.(),
    );

    return {
      connection,
      agent,
      initialization: await this.negotiate(connection),
    };
  }
  private negotiate(connection: ClientConnection): Promise<InitializeResponse> {
    return negotiateAcpInitialize(connection.agent, this.readers);
  }
  private failSubscription(error: Error): void {
    this.connection?.close();
    this.onResourceFailure?.(error);
  }
  public observeResourceFailures(
    onResourceFailure: (cause: unknown) => void,
  ): void {
    this.onResourceFailure = onResourceFailure;
    this.observeAcpConnectionClose(onResourceFailure);
    void this.process
      .then((process) => process.exited)
      .then(() => onResourceFailure(new Error('ACP process exited')))
      .catch(onResourceFailure);
  }
  private observeAcpConnectionClose(
    onResourceFailure: (cause: unknown) => void,
  ): void {
    void this.startup
      .then(({ connection }) =>
        // The SDK aborts its signal with the error that closed it, such as an oversized frame.
        connection.closed.then(() =>
          onResourceFailure(connection.signal.reason),
        ),
      )
      .catch(() => {});
  }
  public async open(
    opening: AcpSessionOpening,
    beforeDispatch: () => void,
  ): Promise<Omit<AcpSessionLease, 'close' | 'replace' | 'released'>> {
    const ready = await this.startup;
    const { agent, initialization } = ready;
    await this.status.requireReady(initialization);
    beforeDispatch();
    const opened = await this.openSession(ready, opening);
    await this.status.requireReady(initialization);
    this.activateSubscription(initialization);

    return { agent, initialization, ...opened };
  }
  private activateSubscription(initialization: InitializeResponse): void {
    if (reportsAuthStatus(initialization))
      this.status.guardActiveSubscription((error) =>
        this.failSubscription(error),
      );
  }
  private openSession(
    ready: Ready,
    opening: AcpSessionOpening,
  ): ReturnType<typeof openProtocolSession> {
    return openProtocolSession({
      agent: ready.agent,
      initialization: ready.initialization,
      opening,
      readers: this.readers,
    });
  }
  public async closeSession(sessionId: string): Promise<void> {
    const { connection } = await this.startup;
    this.readers['session/close'].parse(
      await connection.agent.request<unknown>('session/close', { sessionId }),
    );
  }
  public shutdown(): Promise<void> {
    this.termination ??= this.terminate();

    return this.termination;
  }
  private async terminate(): Promise<void> {
    const process = await this.process;
    this.connection?.close();
    await process.terminate();
    await process.exited;
    this.writes.settlePendingWritesAfterProcessClose();
  }
}
