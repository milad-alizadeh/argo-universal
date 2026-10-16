import type { CreateElicitationResponse } from '@agentclientprotocol/sdk';
import type {
  AcpResources,
  AcpSessionDestination,
  AcpSessionLease,
} from '../../agents';
import type { DeferredAgentLaunch, InstalledAgents } from '../../agents';
import { requireInstalledAgent } from '../../agents';
import type { SessionData } from '../session-data';
import {
  createLifetimeDestination,
  type AcpLifetimeEvent,
} from './acp-session-destination';
import { selectSessionOpening } from './acp-session-opening';
import { AcpSessionRequests } from './requests/acp-session-requests';
import { withShellDestination } from './shells/shell-destination';
import type { ShellRuntime } from './shells/shell-runtime';

export type { AcpLifetimeEvent } from './acp-session-destination';

export type AcpSessionDependencies = {
  resources: AcpResources;
  installedAgents: InstalledAgents;
};

const isWithdrawn = (cause: unknown): boolean =>
  cause instanceof Error && cause.name === 'AbortError';

type SendLifetimeEvent = (event: AcpLifetimeEvent) => void;

export class AcpSessionLifetime {
  private readonly bound = Promise.withResolvers<SendLifetimeEvent>();
  private readonly controller = new AbortController();
  private readonly registration = Promise.withResolvers<void>();
  private opening: Promise<AcpSessionLease> | undefined;
  private closing: Promise<void> | undefined;
  private lease: AcpSessionLease | undefined;
  private attached = false;
  private readonly requests: AcpSessionRequests;
  public constructor(
    private readonly dependencies: AcpSessionDependencies | undefined,
    createId: () => string,
    private readonly shells?: ShellRuntime,
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
    const destination = {
      ...createLifetimeDestination(this.requests, (event) => {
        if (this.attached) sendBack(event);
      }),
    };

    return this.attachShells({
      ...destination,
      registrationFinished: this.registration.promise,
    });
  }
  private attachShells(
    destination: AcpSessionDestination,
  ): AcpSessionDestination {
    return this.shells
      ? withShellDestination(destination, this.shells)
      : destination;
  }
  public finishRegistration(): void {
    this.registration.resolve();
  }

  public open(session: SessionData): Promise<AcpSessionLease> {
    this.opening ??= this.openOwned(session);

    return this.opening;
  }
  private async openOwned(session: SessionData): Promise<AcpSessionLease> {
    const destination = this.createSessionDestination(await this.bound.promise);

    const launch = await this.launchAgent(session);
    this.lease = await this.openLease(session, launch, destination);
    // Shells run with the connection's launch; Agent messages wait for registration, which follows this open.
    this.shells?.configure(session, this.lease.launch);

    return this.lease;
  }
  // Open and Retry launch only an Installed Agent; one removed since shows Send's error.
  private launchAgent(session: SessionData): Promise<DeferredAgentLaunch> {
    const { installedAgents } = this.requireDependencies();

    return installedAgents.launch(
      requireInstalledAgent(installedAgents, session.agent),
      session.projectId,
      this.controller.signal,
    );
  }
  private openLease(
    session: SessionData,
    launch: DeferredAgentLaunch,
    destination: AcpSessionDestination,
  ): Promise<AcpSessionLease> {
    return this.requireDependencies().resources.open({
      launch,
      opening: selectSessionOpening(session),
      destination,
      signal: this.controller.signal,
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
  public close(status: 'lost' | 'stopped' = 'lost'): Promise<void> {
    this.finishRegistration();
    this.requests.cancelAll();
    this.controller.abort();
    this.closing ??= this.closeOwned(status);

    return this.closing;
  }
  // Shells end first: an Agent waiting on one may not answer session/close.
  private async closeOwned(status: 'lost' | 'stopped'): Promise<void> {
    try {
      await this.shells?.close(status);
    } finally {
      await this.closeLease();
    }
  }
  private async closeLease(): Promise<void> {
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
}
