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
import type { AgentLaunch } from '../..';
import type { AuthChanges } from '../../auth/auth-changes';
import { ConnectionAuthentication } from '../../auth/authenticate';
import { authenticationMethods } from '../auth-methods';
import {
  drainProcessExit,
  rejectClosedOpening,
  launchAcpProcess,
} from '../process';
import type {
  AcpOpenInput,
  AcpProcess,
  AcpResourceInput,
  AcpSessionDestination,
  AcpConnectionLease,
  AcpSessionLease,
} from '../resources/resource-types';
import { createAgentClient, awaitAcpOpening } from './client';
import { createDraftSubagentTranslator } from './draft-subagent-updates';
import { negotiateAcpInitialize } from './initialize';
import { sessionCapabilities, openProtocolSession } from './open-session';
import { cancelledElicitation, cancelledPermission } from './refusals';
import { createAcpResponseReaders } from './response-readers';
import { SubagentRoutes } from './subagent-routing';
import { routeTerminalRequests } from './terminal-requests';
import { vendorInitialization } from './vendor-initialization';

type AgentSession = {
  destination: AcpSessionDestination;
  pending: Set<Promise<unknown>>;
  controller: AbortController;
  released: PromiseWithResolvers<void>;
  rejected?: unknown;
};

type Registration = { opening: AcpOpenInput; session: AgentSession };

// What the shared resources hear from one connection.
type ConnectionHooks = {
  forget: () => void;
  idle: () => void;
  authChanges: AuthChanges;
};

type OpeningResponse = Extract<AnyMessage, { result: unknown }>;

type Ready = {
  connection: ClientConnection;
  initialization: InitializeResponse;
  launch: AgentLaunch;
};

const loadMethod = 'session/load';

const resumeMethod = 'session/resume';

const openingMethods = new Set(['session/new', resumeMethod, loadMethod]);

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
  private readonly subagents = new SubagentRoutes(this.agentSessions);
  private readonly registrations = new Map<
    JsonRpcId,
    Registration | undefined
  >();
  private readonly openings: Registration[] = [];
  private readonly readers = createAcpResponseReaders(
    createRejectionCounter('ACP responses'),
  );
  private readonly translateDraftSubagents = createDraftSubagentTranslator(
    createRejectionCounter('ACP draft subagent updates'),
  );
  private connection: ClientConnection | undefined;
  private initialized: Omit<Ready, 'connection'> | undefined;
  private launching: Promise<AcpProcess> | undefined;
  private failure: Error | undefined;
  private stopping: Promise<void> | undefined;
  private authentication?: ConnectionAuthentication;
  public constructor(
    private readonly input: AcpResourceInput,
    private readonly hooks: ConnectionHooks,
  ) {}
  public async start(launch: AgentLaunch): Promise<this> {
    this.launching = (this.input.launchProcess ?? launchAcpProcess)(launch);
    const process = await this.launching;
    this.connection = this.connect(process.stream);
    this.observeExit(process, this.connection);

    const initialization = await negotiateAcpInitialize(
      this.connection.agent,
      this.readers,
    ).catch((cause: unknown) => this.rejectOpening(cause));

    this.acceptInitialization(launch, initialization);

    return this;
  }
  private acceptInitialization(
    launch: AgentLaunch,
    initialization: InitializeResponse,
  ): void {
    this.initialized = {
      initialization: vendorInitialization(launch, initialization),
      launch,
    };
    this.prepareAuthentication(launch);
    this.inheritAuthentication(launch);
  }
  private inheritAuthentication(launch: AgentLaunch): void {
    this.authentication?.inheritRequired(
      this.hooks.authChanges.requiredDescription(
        launch.agentId,
        launch.projectId,
      ),
    );
  }
  // A stopping connection hands out no authentication, so nothing starts after shutdown.
  public getAuthentication(): ConnectionAuthentication | undefined {
    return this.stopping ? undefined : this.authentication;
  }
  private prepareAuthentication(launch: AgentLaunch): void {
    this.authentication = new ConnectionAuthentication({
      launch,
      methods: authenticationMethods(this.requireReady().initialization),
      authenticate: (methodId): Promise<void> => this.authenticate(methodId),
      drop: this.hooks.forget,
      settled: this.hooks.idle,
      changed: (change): void =>
        this.hooks.authChanges.publish(
          { agent: launch.agentId, projectId: launch.projectId },
          change,
        ),
      launchTerminal: this.input.launchLoginTerminal,
    });
  }
  private async authenticate(methodId: string): Promise<void> {
    this.readers.authenticate.parse(
      await this.requireReady().connection.agent.request('authenticate', {
        methodId,
      }),
    );
  }
  private connect(stream: Stream): ClientConnection {
    return createAgentClient({
      stream: this.registerBeforeDispatch(stream),
      acceptSessionUpdate: this.update,
      requestPermission: this.permission,
      createElicitation: this.elicitation,
      terminalRequests: routeTerminalRequests(
        (id) => this.find(id)?.destination.terminalRequests,
      ),
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
        await drainProcessExit(process);
        this.fail(process.exitError?.() ?? asError(connection.signal.reason));
      })
      .catch((cause: unknown) => this.fail(asError(cause)));
  }
  private readonly update = (notification: SessionNotification): undefined => {
    const owner = this.subagents.owner(notification.sessionId);

    if (!owner) return this.unknownUpdate(notification.sessionId);

    if (this.subagents.associate(notification, owner))
      owner.destination.update(notification);
  };
  private unknownUpdate(id: string): undefined {
    if (!this.isLoading(id)) this.find(id);

    return undefined;
  }
  private isLoading(id: string): boolean {
    if (this.supportsResume()) return false;

    return [...this.registrations.values()].some((registration) =>
      this.matchesExistingOpening(registration, id),
    );
  }
  private matchesExistingOpening(
    registration: Registration | undefined,
    id: string,
  ): boolean {
    if (!registration) return false;

    const opening = registration.opening.opening;

    return opening.method === resumeMethod && opening.params.sessionId === id;
  }
  private readonly permission: Permission = (context) =>
    this.respond({
      id: context.params.sessionId,
      invoke: (session) =>
        session.destination.requestPermission({
          ...context,
          signal: AbortSignal.any([context.signal, session.controller.signal]),
        }),
      fallback: cancelledPermission,
    });
  private readonly elicitation: Elicitation = (context) =>
    this.respond({
      id: elicitationSessionId(context.params),
      invoke: (session) =>
        session.destination.createElicitation({
          ...context,
          signal: AbortSignal.any([context.signal, session.controller.signal]),
        }),
      fallback: cancelledElicitation,
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

          for (const translated of this.translateDraftSubagents(message))
            controller.enqueue(translated);
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
    this.hooks.idle();

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

    if (this.supportsResume())
      this.readers[resumeMethod].parse(response.result);
    else this.readers[loadMethod].parse(response.result);

    return opening.params.sessionId;
  }
  public async open(input: AcpOpenInput): Promise<AcpConnectionLease> {
    this.requireAvailable(input);
    const session = createAgentSession(input.destination);
    this.openings.push({ opening: input, session });
    const opened = this.openProtocol(input);

    return awaitAcpOpening(
      opened.then((result) => this.lease({ input, session, opened: result })),
      input.signal,
    );
  }
  private openProtocol(input: AcpOpenInput): Promise<LeaseOpening['opened']> {
    const ready = this.requireReady();

    return openProtocolSession({
      agent: ready.connection.agent,
      initialization: ready.initialization,
      opening: input.opening,
    }).catch((cause: unknown) => this.rejectOpening(cause));
  }
  private connectionClosed(): boolean {
    return this.connection?.signal.aborted ?? false;
  }
  private async rejectOpening(cause: unknown): Promise<never> {
    this.authentication?.recordRequired(cause);

    if (!this.connectionClosed()) throw cause;

    return rejectClosedOpening(await this.launchedProcess(), cause);
  }
  private requireAvailable(input: AcpOpenInput): void {
    if (this.failure) throw this.failure;
    input.signal?.throwIfAborted();
    this.requireOpeningMethod(input);
  }
  private requireOpeningMethod({ opening }: AcpOpenInput): void {
    if (opening.method !== resumeMethod) return;

    if (this.supportsExisting()) return;

    throw new Error('Agent does not support session/resume or session/load');
  }
  private supportsExisting(): boolean {
    return this.supportsResume() || this.supportsLoad();
  }
  private supportsLoad(): boolean {
    return !!this.requireReady().initialization.agentCapabilities?.loadSession;
  }
  private supportsResume(): boolean {
    return !!sessionCapabilities(this.requireReady().initialization)?.resume;
  }
  private requireReady(): Ready {
    if (!this.connection || !this.initialized)
      throw new Error('ACP connection is unavailable');

    return { connection: this.connection, ...this.initialized };
  }
  private async lease(opening: LeaseOpening): Promise<AcpConnectionLease> {
    await this.releaseAbandoned(opening);
    this.requireRegistered(opening);
    const { connection, initialization, launch } = this.requireReady();

    return {
      ...opening.opened,
      launch,
      authentication: this.authentication,
      agent: connection.agent,
      initialization,
      close: this.leaseClose(opening),
      rejectRequest: this.leaseRejection(opening.session),
      released: opening.session.released.promise,
    };
  }
  /*
   * The SDK rejects pending requests as soon as the Agent's output closes, before the exit
   * drain reports why. Waiting for the release, which `fail` gives every Session after its
   * failure, lets the exit end the Turn instead of the closure.
   */
  private leaseRejection(
    session: AgentSession,
  ): (cause: unknown) => Promise<never> {
    return (cause) => this.rejectRequest(session, cause);
  }
  private async rejectRequest(
    session: AgentSession,
    cause: unknown,
  ): Promise<never> {
    if (this.connectionClosed()) await session.released.promise;
    throw cause;
  }
  private leaseClose({ opened, session }: LeaseOpening): () => Promise<void> {
    let closing: Promise<void> | undefined;

    return () => (closing ??= this.close(opened.sessionId, session));
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
    await this.closeProtocolSession(id);
    session.controller.abort();
    await Promise.allSettled(session.pending);
  }
  private async closeProtocolSession(id: string): Promise<void> {
    if (!this.supportsClose()) return;
    this.readers['session/close'].parse(
      await this.connection?.agent.request('session/close', { sessionId: id }),
    );
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
    this.subagents.release(session);
    session.released.resolve();
    this.hooks.idle();
  }
  private fail(error: Error): void {
    if (this.failure) return;
    this.failure = error;
    this.hooks.forget();

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
    return (
      this.agentSessions.size + this.registrations.size > 0 ||
      this.authenticating
    );
  }
  public get authenticating(): boolean {
    return this.authentication?.state().pending != null;
  }
  public shutdown(): Promise<void> {
    this.stopping ??= this.stop();

    return this.stopping;
  }
  private cancelAuthentication(): Promise<void> | undefined {
    return this.authentication?.close();
  }
  private async stop(): Promise<void> {
    const cancellation = this.cancelAuthentication();
    const process = await this.launchedProcess();
    this.connection?.close();

    if (!process) return;
    await process.terminate();
    await process.exited;
    await cancellation;
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
