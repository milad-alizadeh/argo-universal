import type { CreateElicitationResponse } from '@agentclientprotocol/sdk';
import type {
  AcpResources,
  AcpSessionDestination,
  AcpSessionLease,
} from '../../agents';
import type { ResolveAgentLaunch } from '../../agents';
import type { SessionData } from '../session-data';
import {
  createLifetimeDestination,
  reportFencedUpdate,
  type AcpLifetimeEvent,
} from './acp-session-destination';
import { selectSessionOpening } from './acp-session-opening';
import { AcpSessionRequests } from './acp-session-requests';

export type { AcpLifetimeEvent } from './acp-session-destination';

export type AcpSessionDependencies = {
  resources: AcpResources;
  resolveLaunch: ResolveAgentLaunch;
  projectPath: (id: string) => string;
};

const isWithdrawn = (cause: unknown): boolean =>
  cause instanceof Error && cause.name === 'AbortError';

type SendLifetimeEvent = (event: AcpLifetimeEvent) => void;

// Each opening owns a destination; fenced updates report rejection without changing content.
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

    return createLifetimeDestination(this.requests, (event) => {
      if (!this.attached) return;

      if (generation === this.generation) return sendBack(event);
      reportFencedUpdate(event, sendBack);
    });
  }
  public open(session: SessionData): Promise<AcpSessionLease> {
    this.opening ??= this.openOwned(session);

    return this.opening;
  }
  // Empty Sessions have no persisted Agent context; the failed lease is released by its owner.
  public reopen(session: SessionData): Promise<AcpSessionLease> {
    this.requests.cancelAll();
    this.generation += 1;
    this.opening = this.openOwned(
      session.kept ? session : { ...session, vendorSessionId: null },
    );

    return this.opening;
  }
  public replace(session: SessionData): Promise<AcpSessionLease> {
    const lease = this.lease;

    if (!lease) throw new Error('No owned ACP Session to replace');
    this.requests.cancelAll();
    this.generation += 1;
    this.opening = this.replaceOwned(session, lease);

    return this.opening;
  }
  private async replaceOwned(
    session: SessionData,
    lease: AcpSessionLease,
  ): Promise<AcpSessionLease> {
    this.lease = await lease.replace({
      opening: selectSessionOpening(session),
      destination: this.createSessionDestination(await this.bound.promise),
      signal: this.controller.signal,
    });

    return this.lease;
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
