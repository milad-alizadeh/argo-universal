import type {
  AnyMessage,
  AnyRequest,
  ClientConnection,
  ClientRequestHandlersByMethod,
  InitializeResponse,
  JsonRpcId,
  SessionNotification,
  Stream,
} from '@agentclientprotocol/sdk';
import { createRejectionCounter } from '@repo/machine-log';
import type { AgentLaunch } from '..';
import { createAgentClient, awaitAcpOpening } from './client';
import { negotiateAcpInitialize } from './initialize';
import { sessionCapabilities, openProtocolSession } from './open-session';
import { exitDrainMs, launchAcpProcess } from './process';
import type {
  AcpOpenInput,
  AcpProcess,
  AcpResourceInput,
  AcpSessionDestination,
  AcpSessionLease,
} from './resource-types';
import { createAcpResponseReaders } from './response-readers';

type AgentSession = {
  destination: AcpSessionDestination;
  pending: Set<Promise<unknown>>;
  controller: AbortController;
  released: PromiseWithResolvers<void>;
  rejected?: unknown;
};

type Registration = { opening: AcpOpenInput; session: AgentSession };

type OpeningResponse = Extract<AnyMessage, { result: unknown }>;

type Ready = {
  connection: ClientConnection;
  initialization: InitializeResponse;
};

const openingMethods = new Set(['session/new', 'session/resume']);

const isRequest = (message: AnyMessage): message is AnyRequest =>
  'method' in message && 'id' in message;

const isResult = (message: AnyMessage): message is OpeningResponse =>
  'result' in message;

type Permission = ClientRequestHandlersByMethod['session/request_permission'];

type Elicitation = ClientRequestHandlersByMethod['elicitation/create'];

const closeTimeoutMs = 5_000;

type ResponseInput<Result> = {
  id: string | undefined;
  invoke: (session: AgentSession) => Result | Promise<Result>;
  fallback: Result;
};

type LeaseOpening = {
  input: AcpOpenInput;
  session: AgentSession;
  opened: Pick<AcpSessionLease, 'sessionId' | 'response'>;
};

type CancelledResponse<Result> = {
  promise: Promise<Result>;
  release: () => void;
};

const cancelledResponse = <Result>(
  session: AgentSession,
  fallback: Result,
): CancelledResponse<Result> => {
  const aborted = Promise.withResolvers<Result>();
  const abort = (): void => aborted.resolve(fallback);
  session.controller.signal.addEventListener('abort', abort, { once: true });

  return {
    promise: aborted.promise,
    release: (): void =>
      session.controller.signal.removeEventListener('abort', abort),
  };
};

const asError = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error(String(cause));

const createAgentSession = (
  destination: AcpSessionDestination,
): AgentSession => ({
  destination,
  pending: new Set(),
  controller: new AbortController(),
  released: Promise.withResolvers<void>(),
});

const elicitationSessionId = (
  params: Parameters<Elicitation>[0]['params'],
): string | undefined =>
  'sessionId' in params && typeof params.sessionId === 'string'
    ? params.sessionId
    : undefined;

export class AcpConnection {
  private readonly agentSessions = new Map<string, AgentSession>();
  private readonly registrations = new Map<
    JsonRpcId,
    Registration | undefined
  >();
  private readonly openings: Registration[] = [];
  private readonly readers = createAcpResponseReaders(
    createRejectionCounter('ACP responses'),
  );
  private connection: ClientConnection | undefined;
  private initialization: InitializeResponse | undefined;
  private launching: Promise<AcpProcess> | undefined;
  private failure: Error | undefined;
  private stopping: Promise<void> | undefined;
  public constructor(
    private readonly input: AcpResourceInput,
    private readonly forget: () => void,
    private readonly idle: () => void,
  ) {}
  public async start(launch: AgentLaunch): Promise<this> {
    this.launching = (this.input.launchProcess ?? launchAcpProcess)(launch);
    const process = await this.launching;
    this.connection = this.connect(process.stream);
    this.observeExit(process, this.connection);
    this.initialization = await negotiateAcpInitialize(
      this.connection.agent,
      this.readers,
    );

    return this;
  }
  private connect(stream: Stream): ClientConnection {
    return createAgentClient({
      stream: this.registerBeforeDispatch(stream),
      acceptSessionUpdate: this.update,
      requestPermission: this.permission,
      createElicitation: this.elicitation,
    });
  }
  private observeExit(process: AcpProcess, connection: ClientConnection): void {
    void process.exited
      .then(() =>
        this.fail(process.exitError?.() ?? new Error('ACP process exited')),
      )
      .catch((cause: unknown) => this.fail(asError(cause)));
    this.observeConnectionClose(process, connection);
  }
  private observeConnectionClose(
    process: AcpProcess,
    connection: ClientConnection,
  ): void {
    void connection.closed
      .then(async () => {
        await Promise.race([
          process.exited,
          new Promise<void>((resolve) => setTimeout(resolve, exitDrainMs)),
        ]);
        this.fail(process.exitError?.() ?? asError(connection.signal.reason));
      })
      .catch((cause: unknown) => this.fail(asError(cause)));
  }
  private readonly update = (notification: SessionNotification): undefined => {
    this.find(notification.sessionId)?.destination.update(notification);
  };
  private readonly permission: Permission = (context) =>
    this.respond({
      id: context.params.sessionId,
      invoke: (session) =>
        session.destination.requestPermission({
          ...context,
          signal: AbortSignal.any([context.signal, session.controller.signal]),
        }),
      fallback: { outcome: { outcome: 'cancelled' } },
    });
  private readonly elicitation: Elicitation = (context) =>
    this.respond({
      id: elicitationSessionId(context.params),
      invoke: (session) =>
        session.destination.createElicitation({
          ...context,
          signal: AbortSignal.any([context.signal, session.controller.signal]),
        }),
      fallback: { action: 'cancel' },
    });
  private find(id: string | undefined): AgentSession | undefined {
    const session = id === undefined ? undefined : this.agentSessions.get(id);

    if (!session)
      console.warn(
        `Unknown Agent session ${String(id)}; dropping Agent message`,
      );

    return session;
  }
  private async respond<Result>(input: ResponseInput<Result>): Promise<Result> {
    const session = this.find(input.id);

    if (!session) return input.fallback;
    const cancelled = cancelledResponse(session, input.fallback);

    try {
      const work = Promise.race([
        Promise.resolve(input.invoke(session)),
        cancelled.promise,
      ]);

      return await this.trackResponse(session, work);
    } finally {
      cancelled.release();
    }
  }
  private async trackResponse<Result>(
    session: AgentSession,
    work: Promise<Result>,
  ): Promise<Result> {
    session.pending.add(work);

    try {
      return await work;
    } finally {
      session.pending.delete(work);
    }
  }
  private registerBeforeDispatch(stream: Stream): Stream {
    return {
      writable: this.registeredOutput(stream.writable.getWriter()),
      readable: this.registeredInput(stream.readable),
    };
  }
  private registeredOutput(
    writer: WritableStreamDefaultWriter<AnyMessage>,
  ): WritableStream<AnyMessage> {
    return new WritableStream({
      write: async (message) => {
        this.recordOpening(message);
        await writer.write(message);
      },
      close: () => writer.close(),
      abort: (error) => writer.abort(error),
    });
  }
  private registeredInput(readable: Stream['readable']): Stream['readable'] {
    return readable.pipeThrough(
      new TransformStream({
        transform: async (message, controller) => {
          const registered = this.registerResponse(message);
          controller.enqueue(message);
          await registered;
        },
      }),
    );
  }
  private recordOpening(message: AnyMessage): void {
    if (!isRequest(message)) return;

    if (openingMethods.has(message.method))
      this.registrations.set(message.id, this.openings.shift());
  }
  private registerResponse(message: AnyMessage): Promise<void> | undefined {
    // Agent requests count their ids separately, so only a response can answer an opening.
    if (!('id' in message) || 'method' in message) return undefined;
    const registration = this.registrations.get(message.id);
    this.registrations.delete(message.id);

    const registered = this.registerKnown(registration, message);
    this.idle();

    return registered;
  }
  private registerKnown(
    registration: Registration | undefined,
    message: AnyMessage,
  ): Promise<void> | undefined {
    if (!registration || !isResult(message)) return undefined;

    return this.register(registration, message);
  }
  private register(
    registration: Registration,
    response: OpeningResponse,
  ): Promise<void> | undefined {
    const id = this.readNewIdentity(registration, response);

    if (id === undefined) return undefined;

    return this.registerIdentity(id, registration);
  }
  private registerIdentity(
    id: string,
    { opening, session }: Registration,
  ): Promise<void> | undefined {
    if (opening.signal?.aborted) return undefined;
    this.agentSessions.set(id, session);

    return opening.destination.registrationFinished;
  }
  // A bad or duplicate identity fails only its own open, in `requireRegistered`; a throw here would end the shared connection.
  private readNewIdentity(
    { opening, session }: Registration,
    response: OpeningResponse,
  ): string | undefined {
    try {
      const id = this.readIdentity(opening, response);

      return this.agentSessions.has(id) ? undefined : id;
    } catch (error) {
      session.rejected = error;

      return undefined;
    }
  }
  private readIdentity(
    { opening }: AcpOpenInput,
    response: OpeningResponse,
  ): string {
    if (opening.method === 'session/new')
      return this.readers['session/new'].parse(response.result).sessionId;
    this.readers['session/resume'].parse(response.result);

    return opening.params.sessionId;
  }
  public async open(input: AcpOpenInput): Promise<AcpSessionLease> {
    this.requireAvailable(input);
    const session = createAgentSession(input.destination);
    const ready = this.requireReady();
    this.openings.push({ opening: input, session });

    const opened = openProtocolSession({
      agent: ready.connection.agent,
      initialization: ready.initialization,
      opening: input.opening,
    });

    return awaitAcpOpening(
      opened.then((result) => this.lease({ input, session, opened: result })),
      input.signal,
    );
  }
  private requireAvailable(input: AcpOpenInput): void {
    if (this.failure) throw this.failure;
    input.signal?.throwIfAborted();
    this.requireOpeningMethod(input);
  }
  private requireOpeningMethod({ opening }: AcpOpenInput): void {
    if (opening.method === 'session/resume' && !this.supportsResume())
      throw new Error('Agent does not support session/resume');
  }
  private supportsResume(): boolean {
    return !!sessionCapabilities(this.requireReady().initialization)?.resume;
  }
  private requireReady(): Ready {
    if (!this.connection || !this.initialization)
      throw new Error('ACP connection is unavailable');

    return { connection: this.connection, initialization: this.initialization };
  }
  private async lease(opening: LeaseOpening): Promise<AcpSessionLease> {
    await this.releaseAbandoned(opening);
    this.requireRegistered(opening);
    const { connection, initialization } = this.requireReady();
    let closing: Promise<void> | undefined;

    return {
      ...opening.opened,
      agent: connection.agent,
      initialization,
      close: () =>
        (closing ??= this.close(opening.opened.sessionId, opening.session)),
      released: opening.session.released.promise,
    };
  }
  private requireRegistered(opening: LeaseOpening): void {
    if (this.failure) throw this.failure;
    this.requireOwnIdentity(opening);
  }
  private requireOwnIdentity({ opened, session }: LeaseOpening): void {
    if (session.rejected) throw session.rejected;

    if (this.agentSessions.get(opened.sessionId) !== session)
      throw new Error(`Agent session ${opened.sessionId} could not be opened`);
  }
  private async releaseAbandoned({
    input,
    opened,
    session,
  }: LeaseOpening): Promise<void> {
    if (!input.signal?.aborted) return;
    await this.close(opened.sessionId, session);
    input.signal.throwIfAborted();
  }
  private async close(id: string, session: AgentSession): Promise<void> {
    const deadline = Promise.withResolvers<never>();

    const timer = setTimeout(
      () => deadline.reject(new Error('ACP Session close timed out')),
      this.input.closeTimeoutMs ?? closeTimeoutMs,
    );

    try {
      await Promise.race([this.closeAndDrain(id, session), deadline.promise]);
    } catch (error) {
      console.error('ACP Session close failed; releasing', error);
    } finally {
      clearTimeout(timer);
      this.release(id, session);
    }
  }
  private async closeAndDrain(
    id: string,
    session: AgentSession,
  ): Promise<void> {
    if (this.supportsClose())
      this.readers['session/close'].parse(
        await this.connection?.agent.request('session/close', {
          sessionId: id,
        }),
      );
    session.controller.abort();
    await Promise.allSettled(session.pending);
  }
  private supportsClose(): boolean {
    return (
      !this.failure &&
      !!sessionCapabilities(this.requireReady().initialization)?.close
    );
  }
  private release(id: string, session: AgentSession): void {
    session.controller.abort();

    if (this.agentSessions.get(id) === session) this.agentSessions.delete(id);
    session.released.resolve();
    this.idle();
  }
  private fail(error: Error): void {
    if (this.failure) return;
    this.failure = error;
    this.forget();

    for (const [id, session] of this.agentSessions) {
      session.destination.failed(error);
      this.release(id, session);
    }

    this.abandon(error);
  }
  // Transport failure can precede process exit; shutdown stays idempotent.
  private abandon(error: Error): void {
    this.connection?.close(error);
    void this.shutdown().catch(console.error);
  }
  public get inUse(): boolean {
    return this.agentSessions.size > 0 || this.registrations.size > 0;
  }
  public shutdown(): Promise<void> {
    this.stopping ??= this.stop();

    return this.stopping;
  }
  private async stop(): Promise<void> {
    const process = await this.launchedProcess();
    this.connection?.close();

    if (!process) return;
    await process.terminate();
    await process.exited;
  }
  // A failed launch has no process to stop; start() already reported it.
  private async launchedProcess(): Promise<AcpProcess | undefined> {
    try {
      return await this.launching;
    } catch {
      return;
    }
  }
}
