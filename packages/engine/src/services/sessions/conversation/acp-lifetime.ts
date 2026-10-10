import type {
  CreateElicitationResponse,
  SessionNotification,
  NewSessionRequest,
} from '@agentclientprotocol/sdk';
import type {
  AcpResources,
  AcpSessionDestination,
  AcpSessionLease,
  AcpSessionOpening,
  ResolveAgentLaunch,
} from '../../agents';
import type { SessionData } from '../session-data';
import {
  AcpSessionRequests,
  type AcpRequestEvent,
} from './acp-session-requests';

export type AcpSessionDependencies = {
  resources: AcpResources;
  resolveLaunch: ResolveAgentLaunch;
  projectPath: (id: string) => string;
};
export type AcpLifetimeEvent =
  | { type: 'acp.update'; notification: SessionNotification }
  | { type: 'acp.failed'; error: unknown }
  | AcpRequestEvent;
const createNewSessionRequest = (session: SessionData): NewSessionRequest => ({
  cwd: session.checkout.path,
  mcpServers: [],
});
const isWithdrawn = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';
const selectSessionOpening = (session: SessionData): AcpSessionOpening => {
  const params = createNewSessionRequest(session);
  if (session.vendorSessionId === null)
    return { method: 'session/new', params };
  return {
    method: 'session/resume',
    params: { ...params, sessionId: session.vendorSessionId },
  };
};
export class AcpSessionLifetime {
  private readonly bound = Promise.withResolvers<AcpSessionDestination>();
  private readonly controller = new AbortController();
  private opening: Promise<AcpSessionLease> | undefined;
  private closing: Promise<void> | undefined;
  private lease: AcpSessionLease | undefined;
  private attached = false;
  private readonly requests: AcpSessionRequests;
  public constructor(
    private readonly dependencies: AcpSessionDependencies | undefined,
    createId: () => string,
  ) {
    this.requests = new AcpSessionRequests(createId);
  }
  public bind(sendBack: (event: AcpLifetimeEvent) => void): () => void {
    this.attached = true;
    this.bound.resolve(this.createSessionDestination(sendBack));
    return () => {
      this.attached = false;
      void this.close().catch(() => {});
    };
  }
  private createSessionDestination(
    sendBack: (event: AcpLifetimeEvent) => void,
  ): AcpSessionDestination {
    const send = (event: AcpLifetimeEvent): void => {
      if (this.attached) sendBack(event);
    };
    return {
      update: (notification): undefined => {
        send({ type: 'acp.update', notification });
      },
      failed: (error) => send({ type: 'acp.failed', error }),
      requestPermission: this.requests.requestPermission(send),
      createElicitation: this.requests.createElicitation(send),
    };
  }
  public open(session: SessionData): Promise<AcpSessionLease> {
    this.opening ??= this.openOwned(session);
    return this.opening;
  }
  private async openOwned(session: SessionData): Promise<AcpSessionLease> {
    const dependencies = this.requireDependencies();
    const destination = await this.bound.promise;
    const launch = await this.resolveSessionAgentLaunch(session, dependencies);
    this.lease = await dependencies.resources.open({
      launch,
      opening: selectSessionOpening(session),
      destination,
      signal: this.controller.signal,
    });
    return this.lease;
  }
  private resolveSessionAgentLaunch(
    session: SessionData,
    dependencies: AcpSessionDependencies,
  ): ReturnType<ResolveAgentLaunch> {
    return dependencies.resolveLaunch({
      agent: session.agent,
      projectId: session.projectId,
      projectPath: dependencies.projectPath(session.projectId),
    });
  }
  private requireDependencies(): AcpSessionDependencies {
    if (!this.dependencies) throw new Error('No configured ACP Agent launch');
    return this.dependencies;
  }
  public answerPermission(requestId: string, optionId: string | null): void {
    this.requests.answerPermission(requestId, optionId);
  }
  public answerElicitation(
    requestId: string,
    response: CreateElicitationResponse,
  ): void {
    this.requests.answerElicitation(requestId, response);
  }
  public cancelRequest(requestId: string): void {
    this.requests.cancel(requestId);
  }
  public cancelRequests = (): void => this.requests.cancelAll();
  public close(): Promise<void> {
    this.requests.cancelAll();
    this.controller.abort();
    this.closing ??= this.closeOwned();
    return this.closing;
  }
  private async closeOwned(): Promise<void> {
    try {
      await this.closeOpening();
    } catch (error) {
      if (!isWithdrawn(error)) throw error;
    }
  }
  private async closeOpening(): Promise<void> {
    const lease = await this.opening;
    await lease?.close();
  }
  public async waitForRelease(): Promise<void> {
    await this.lease?.released;
  }
}
