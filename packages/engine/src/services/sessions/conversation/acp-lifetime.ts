import type { SessionNotification } from '@agentclientprotocol/sdk';
import type {
  AcpResources,
  AcpSessionDestination,
  AcpSessionLease,
  AcpSessionOpening,
  ResolveAgentLaunch,
} from '../../agents';
import type { SessionData } from '../session-data';

export type AcpSessionDependencies = {
  resources: AcpResources;
  resolveLaunch: ResolveAgentLaunch;
  projectPath: (id: string) => string;
};
export type AcpLifetimeEvent =
  | { type: 'acp.update'; notification: SessionNotification }
  | { type: 'acp.failed'; error: unknown };
const openingRequest = (
  session: SessionData,
): import('@agentclientprotocol/sdk').NewSessionRequest => ({
  cwd: session.checkout.path,
  mcpServers: [],
});
const isWithdrawn = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';
const sessionOpening = (session: SessionData): AcpSessionOpening => {
  const params = openingRequest(session);
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
  public constructor(
    private readonly dependencies: AcpSessionDependencies | undefined,
  ) {}
  public bind(sendBack: (event: AcpLifetimeEvent) => void): () => void {
    this.attached = true;
    this.bound.resolve(this.destination(sendBack));
    return () => {
      this.attached = false;
      void this.close().catch(() => {});
    };
  }
  private destination(
    sendBack: (event: AcpLifetimeEvent) => void,
  ): AcpSessionDestination {
    return {
      update: (notification): undefined => {
        if (this.attached) sendBack({ type: 'acp.update', notification });
      },
      failed: (error) => {
        if (this.attached) sendBack({ type: 'acp.failed', error });
      },
      requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
      createElicitation: () => ({ action: 'cancel' }),
    };
  }
  public open(session: SessionData): Promise<AcpSessionLease> {
    this.opening ??= this.openOwned(session);
    return this.opening;
  }
  private async openOwned(session: SessionData): Promise<AcpSessionLease> {
    const dependencies = this.requireDependencies();
    const destination = await this.bound.promise;
    const launch = await this.launch(session, dependencies);
    this.lease = await dependencies.resources.open({
      launch,
      opening: sessionOpening(session),
      destination,
      signal: this.controller.signal,
    });
    return this.lease;
  }
  private launch(
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
  public close(): Promise<void> {
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
  public async released(): Promise<void> {
    await this.lease?.released;
  }
}
