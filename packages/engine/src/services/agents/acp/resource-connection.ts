import type {
  ClientConnection,
  InitializeResponse,
} from '@agentclientprotocol/sdk';
import { createRejectionCounter } from '../../../lib/count-rejections';
import { createAgentClient } from './client';
import { negotiateAcpInitialize } from './initialize';
import { openProtocolSession } from './open-session';
import { launchAcpProcess } from './process';
import type {
  AcpProcess,
  AcpResourceInput,
  AcpSessionLease,
  AcpSessionOpening,
  AgentLaunch,
} from './resource-types';
import {
  createPermissionResponder,
  createElicitationResponder,
} from './responders';
import { createAcpResponseReaders } from './response-readers';
import { AcpResponseWrites } from './response-writes';
import type { AcpRouting } from './routing';

type Ready = {
  connection: ClientConnection;
  initialization: InitializeResponse;
};
type ClientRequestHandlers = Pick<
  Parameters<typeof createAgentClient>[0],
  'requestPermission' | 'createElicitation'
>;
export class AcpResourceConnection {
  private onResourceFailure: ((error: unknown) => void) | undefined;
  private readonly writes = new AcpResponseWrites((error) =>
    this.onResourceFailure?.(error),
  );
  private readonly readers = createAcpResponseReaders(
    createRejectionCounter('ACP responses'),
  );
  private readonly process: Promise<AcpProcess>;
  private readonly startup: Promise<Ready>;
  private connection: ClientConnection | undefined;
  private termination: Promise<void> | undefined;
  public constructor(
    input: AcpResourceInput,
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
      ...this.createClientRequestHandlers(),
    });
    return {
      connection: this.connection,
      initialization: await negotiateAcpInitialize(
        this.connection.agent,
        this.readers,
      ),
    };
  }
  private createClientRequestHandlers(): ClientRequestHandlers {
    return {
      requestPermission: createPermissionResponder(
        this.routing.findSessionReservation,
        this.writes,
      ),
      createElicitation: createElicitationResponder(
        this.routing.findSessionReservation,
        this.writes,
      ),
    };
  }
  public observeResourceFailures(
    onResourceFailure: (error: unknown) => void,
  ): void {
    this.onResourceFailure = onResourceFailure;
    this.observeAcpConnectionClose(onResourceFailure);
    void this.process
      .then((process) => process.exited)
      .then(() => onResourceFailure(new Error('ACP process exited')))
      .catch(onResourceFailure);
  }
  private observeAcpConnectionClose(
    onResourceFailure: (error: unknown) => void,
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
  ): Promise<Omit<AcpSessionLease, 'close' | 'released'>> {
    const { connection, initialization } = await this.startup;
    beforeDispatch();
    const opened = await openProtocolSession({
      agent: connection.agent,
      initialization,
      opening,
      readers: this.readers,
    });
    return { agent: connection.agent, initialization, ...opened };
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
