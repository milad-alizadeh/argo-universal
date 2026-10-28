import { randomBytes } from 'node:crypto';
import { TRPCError } from '@trpc/server';

export type SessionCaller = {
  kind: 'session';
  sessionId: string;
  projectId: string;
};

export type OperationCaller = { kind: 'user' } | SessionCaller;

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
  public require(token: string | undefined): SessionCaller {
    const caller = token === undefined ? undefined : this.callers.get(token);

    if (caller) return caller;
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'An Argo token is required',
    });
  }
}
