import { randomBytes } from 'node:crypto';
import { productName } from '@repo/contracts/product-identity';
import { TRPCError } from '@trpc/server';
import type { AccessGrant, ArgoToolsState } from '../agents';

export type SessionCaller = {
  kind: 'session';
  sessionId: string;
  projectId: string;
};

export type UserCaller = { kind: 'user' };

// The App calls Operations from its own procedures, with neither a token nor a Tool call.
export type AppCaller = { kind: 'app'; connectionSignal?: AbortSignal };

// Every kind of caller an Operation has.
type OperationCaller = AppCaller | UserCaller | SessionCaller;

// A caller that presents a token: the user's, or a Session's.
export type TokenCaller = Exclude<OperationCaller, AppCaller>;

const tokenBytes = 32;

type TokenGrant = Required<AccessGrant> & { token: string };

// `argo mcp` starts in two to eight seconds through tsx; an Agent past this has dropped it rather than being slow.
export const argoToolsGraceMs = 20_000;

type TokenClock = { now: () => number; argoToolsGraceMs: number };

export class SessionTokens {
  private readonly callers = new Map<string, SessionCaller>();
  private readonly issuedAt = new Map<string, number>();
  private readonly withTools = new Set<string>();
  public constructor(
    private readonly clock: TokenClock = { now: Date.now, argoToolsGraceMs },
  ) {}
  public issue(sessionId: string, projectId: string): TokenGrant {
    const token = randomBytes(tokenBytes).toString('hex');
    this.callers.set(token, { kind: 'session', sessionId, projectId });
    this.issuedAt.set(token, this.clock.now());

    return {
      token,
      release: (): void => this.forget(token),
      argoTools: (): ArgoToolsState => this.argoTools(token),
    };
  }
  private forget(token: string): void {
    this.callers.delete(token);
    this.issuedAt.delete(token);
    this.withTools.delete(token);
  }
  private argoTools(token: string): ArgoToolsState {
    if (this.withTools.has(token)) return 'loaded';

    return this.waited(token) < this.clock.argoToolsGraceMs
      ? 'waiting'
      : 'missing';
  }
  private waited(token: string): number {
    return this.clock.now() - (this.issuedAt.get(token) ?? 0);
  }
  // `argo mcp` reads its instructions as it starts, so a Session token reading them means its Agent loaded Argo's tools.
  public recordToolsLoaded(token: string | undefined): void {
    if (token !== undefined && this.callers.has(token))
      this.withTools.add(token);
  }
  // Whether this is a token a live Session holds, which only a process on this computer was given (#1696).
  public recognises(token: string): boolean {
    return this.callers.has(token);
  }
  public require(token: string | undefined): SessionCaller {
    const caller = token === undefined ? undefined : this.callers.get(token);

    if (caller) return caller;
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: `An ${productName} token is required`,
    });
  }
}
