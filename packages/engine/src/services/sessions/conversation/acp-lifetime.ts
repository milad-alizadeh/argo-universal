import type {
  CreateElicitationResponse,
  SessionNotification,
} from '@agentclientprotocol/sdk';
import type {
  AcpResources,
  AcpSessionDestination,
  AcpSessionLease,
  ResolveAgentLaunch,
} from '../../agents';
import type { SessionData } from '../session-data';
import { selectSessionOpening } from './acp-session-opening';
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
const isWithdrawn = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';
type SendLifetimeEvent = (event: AcpLifetimeEvent) => void;
const createDestination = (
  requests: AcpSessionRequests,
  send: SendLifetimeEvent,
): AcpSessionDestination => ({
  update: (notification): undefined => {
    send({ type: 'acp.update', notification });
  },
  failed: (error) => send({ type: 'acp.failed', error }),
  requestPermission: requests.requestPermission(send),
  createElicitation: requests.createElicitation(send),
});
// Each opening gets its own destination; a replaced generation's late callbacks are dropped.
export class AcpSessionLifetime {
  private readonly bound = Promise.withResolvers<SendLifetimeEvent>();
  private readonly controller = new AbortController();
  private generation = 0;
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
  public bind(sendBack: SendLifetimeEvent): () => void {
    this.attached = true;
    this.bound.resolve(sendBack);
    return () => {
      this.attached = false;
      void this.close().catch(() => {});
    };
  }
  private createSessionDestination(
    sendBack: SendLifetimeEvent,
  ): AcpSessionDestination {
    const generation = this.generation;
    return createDestination(this.requests, (event) => {
      if (this.attached && generation === this.generation) sendBack(event);
    });
  }
  public open(session: SessionData): Promise<AcpSessionLease> {
    this.opening ??= this.openOwned(session);
    return this.opening;
  }
  // Recovery resumes the Session on a replacement connection; the failed lease is released by its owner.
  public reopen(session: SessionData): Promise<AcpSessionLease> {
    this.requests.cancelAll();
    this.generation += 1;
    this.opening = this.openOwned(session);
    return this.opening;
  }
  private async openOwned(session: SessionData): Promise<AcpSessionLease> {
    const dependencies = this.requireDependencies();
    const destination = this.createSessionDestination(await this.bound.promise);
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
  // The prompt's own result, not this request, ends the Turn.
  public cancelPrompt(): void {
    void this.lease?.agent
      .notify('session/cancel', { sessionId: this.lease.sessionId })
      .catch((error: unknown) => console.error('ACP cancel not sent', error));
  }
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
