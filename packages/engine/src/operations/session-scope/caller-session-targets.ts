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

// The picture is the calling Session's own: it takes no params and reaches nothing but that Session, so an Agent's call needs no ask.
export const ownSession = <Params>(
  params: Params,
  caller: SessionCaller,
): Targeted<Params> => ({
  target: { kind: 'session', sessionId: caller.sessionId, opening: false },
  params,
});

// A Session hangs up only its own Conversation (#2413); naming any other Session is refused, whatever its scope covers.
export const ownSessionOnly = <Params extends { sessionId?: string }>(
  params: Params,
  caller: SessionCaller,
): Targeted<Params & { sessionId: string }> => {
  if (params.sessionId !== undefined && params.sessionId !== caller.sessionId)
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: "A Session hangs up only its own Session's Conversation",
    });

  return callerSessionParam(params, caller);
};
