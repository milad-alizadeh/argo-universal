import { randomBytes } from 'node:crypto';
import { TRPCError } from '@trpc/server';

export type SessionCaller = {
  kind: 'session';
  sessionId: string;
  projectId: string;
};

export type UserCaller = { kind: 'user' };

// The App calls Operations from its own procedures, with neither a token nor a Tool call.
export type AppCaller = { kind: 'app' };

// Every kind of caller an Operation has.
type OperationCaller = AppCaller | UserCaller | SessionCaller;

// A caller that presents a token: the user's, or a Session's.
export type TokenCaller = Exclude<OperationCaller, AppCaller>;

const tokenBytes = 32;

type TokenGrant = { token: string; release: () => void };

export class SessionTokens {
  private readonly callers = new Map<string, SessionCaller>();
  public issue(sessionId: string, projectId: string): TokenGrant {
    const token = randomBytes(tokenBytes).toString('hex');
    this.callers.set(token, { kind: 'session', sessionId, projectId });

    return {
      token,
      release: (): void => {
        this.callers.delete(token);
      },
    };
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
      message: 'An Argo token is required',
    });
  }
}
