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
  timeoutMs: number;
  cleanupTimeoutMs: number;
};
const cleanupDeadline = (
  milliseconds: number,
): { expired: Promise<never>; timer: ReturnType<typeof setTimeout> } => {
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
  private release?: () => void;
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
    this.release?.();
    this.release = undefined;
  }
  private requireConnection(): LoginAgentConnection {
    if (!this.connection) throw new Error('Login connection is missing');
    return this.connection;
  }
  private async acquire(): Promise<void> {
    const subject = await this.deps.resolveLaunch(this.agentId);
    if (this.abort.signal.aborted) return;
    this.release = this.deps.reserveAuthentication(subject.launch);
    this.connection = await this.deps.openLoginAgent(subject, {
      signal: this.abort.signal,
      createElicitation: this.createElicitation,
    });
  }
  private async closeConnection(): Promise<void> {
    await this.opening?.catch((error: unknown): Promise<void> | undefined =>
      error instanceof ResourceCleanupError ? error.awaitCleanup() : undefined,
    );
    await this.connection?.close();
  }
}
