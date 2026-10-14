import type {
  AgentLoginTerminalInput,
  AgentLoginTerminalFrame,
} from '@repo/contracts';
import { authenticationContextKey } from '../lib/authentication-context';
import { ResourceCleanupError } from '../lib/resource-cleanup-error';
import type {
  AgentLaunchSubject,
  LoginAgentConnection,
  LoginAgentCallbacks,
  LoginAgentOutcome,
  OpenLoginAgent,
} from './agent-launch';

export type LoginOperationDeps = {
  resolveLaunch: (agentId: string) => Promise<AgentLaunchSubject>;
  openLoginAgent: OpenLoginAgent;
  reserveAuthentication: (launch: AgentLaunchSubject['launch']) => () => void;
  settleAuthentication: (launch: AgentLaunchSubject['launch']) => Promise<void>;
  timeoutMs: number;
  cleanupTimeoutMs: number;
};

type CleanupDeadline = {
  expired: Promise<never>;
  timer: ReturnType<typeof setTimeout>;
};

const cleanupDeadline = (milliseconds: number): CleanupDeadline => {
  const expired = Promise.withResolvers<never>();

  const timer = setTimeout(
    (): void =>
      expired.reject(new Error('Login resources did not close in time')),
    milliseconds,
  );

  timer.unref();

  return { expired: expired.promise, timer };
};

const boundedCleanup = async (
  promise: Promise<void>,
  milliseconds: number,
): Promise<void> => {
  const { expired, timer } = cleanupDeadline(milliseconds);

  try {
    await Promise.race([promise, expired]);
  } finally {
    clearTimeout(timer);
  }
};

export class LoginResources {
  private readonly abort = new AbortController();
  private opening?: Promise<void>;
  private connection?: LoginAgentConnection;
  private readonly releases: (() => void)[] = [];
  private baseAuthentication?: string;
  public constructor(
    private readonly agentId: string,
    private readonly deps: LoginOperationDeps,
    private readonly createElicitation: LoginAgentCallbacks['createElicitation'],
  ) {}
  public async open(): Promise<boolean> {
    this.opening = this.acquire();
    await this.opening;

    return this.methods().length > 0;
  }
  public methods(): { id: string; name: string }[] {
    return this.connection?.methods.map(({ id, name }) => ({ id, name })) ?? [];
  }
  public terminalActive(): boolean {
    return this.connection?.terminalActive?.() ?? false;
  }
  public readTerminal(cursor: number): AgentLoginTerminalFrame {
    const read = this.requireConnection().readTerminal;

    if (!read) throw new Error('Login has no terminal');

    return read(cursor);
  }
  public inputTerminal(input: AgentLoginTerminalInput): void {
    const write = this.requireConnection().inputTerminal;

    if (!write) throw new Error('Login has no terminal');
    write(input);
  }
  public abortLogin(): void {
    this.abort.abort();
  }
  public async authenticate(methodId: string): Promise<void> {
    await this.requireConnection().authenticate(methodId);
  }
  public async checkReady(): Promise<LoginAgentOutcome> {
    return this.requireConnection().checkReady();
  }
  public async close(): Promise<void> {
    await boundedCleanup(this.closeConnection(), this.deps.cleanupTimeoutMs);

    for (const release of this.releases.splice(0)) release();
  }
  private requireConnection(): LoginAgentConnection {
    if (!this.connection) throw new Error('Login connection is missing');

    return this.connection;
  }
  private async acquire(): Promise<void> {
    const subject = await this.deps.resolveLaunch(this.agentId);
    await this.deps.settleAuthentication(subject.launch);

    if (this.abort.signal.aborted) return;
    this.releases.push(this.deps.reserveAuthentication(subject.launch));
    this.baseAuthentication = authenticationContextKey(subject.launch);
    this.connection = await this.deps.openLoginAgent(subject, {
      signal: this.abort.signal,
      createElicitation: this.createElicitation,
      reserveTerminalAuthentication: (launch) =>
        this.reserveTerminalAuthentication(launch),
    });
  }
  private reserveTerminalAuthentication(
    launch: AgentLaunchSubject['launch'],
  ): void {
    if (authenticationContextKey(launch) === this.baseAuthentication) return;
    this.releases.push(this.deps.reserveAuthentication(launch));
  }
  private async closeConnection(): Promise<void> {
    await this.opening?.catch((cause: unknown): Promise<void> | undefined =>
      cause instanceof ResourceCleanupError ? cause.awaitCleanup() : undefined,
    );
    await this.connection?.close();
  }
}
