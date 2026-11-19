import { TRPCError } from '@trpc/server';
import type { SessionCaller } from '../session-tokens';
import type { Targeted } from './targets';

// A Plugin's Checkout, or the Session that declares an Agent role: the calling Session unless the params name another.
export const callerSessionParam = <Params extends { sessionId?: string }>(
  params: Params,
  caller: SessionCaller,
): Targeted<Params & { sessionId: string }> => {
  const sessionId = params.sessionId ?? caller.sessionId;

  return {
    target: { kind: 'session', sessionId, opening: false },
    params: { ...params, sessionId },
  };
};

// A Session hangs up only its own Voice call (#2413); naming any other Session is refused, whatever its scope covers.
export const ownSessionOnly = <Params extends { sessionId?: string }>(
  params: Params,
  caller: SessionCaller,
): Targeted<Params & { sessionId: string }> => {
  if (params.sessionId !== undefined && params.sessionId !== caller.sessionId)
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: "A Session hangs up only its own Session's Voice call",
    });

  return callerSessionParam(params, caller);
};
