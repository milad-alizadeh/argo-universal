import { TRPCError } from '@trpc/server';
import type { SessionCaller } from '../session-tokens';

// A Plugin's Checkout, or the Session that declares an Agent role: the calling Session unless the params name another.
export const callerSessionParam = <Params extends { sessionId?: string }>(
  params: Params,
  caller: SessionCaller,
): Params & { sessionId: string } => {
  const sessionId = params.sessionId ?? caller.sessionId;

  return { ...params, sessionId };
};

// A Session hangs up only its own Conversation (#2413); naming any other Session is refused, whatever its scope covers.
export const ownSessionOnly =
  (message = "A Session hangs up only its own Session's Conversation") =>
  <Params extends { sessionId?: string }>(
    params: Params,
    caller: SessionCaller,
  ): Params & { sessionId: string } => {
    if (params.sessionId !== undefined && params.sessionId !== caller.sessionId)
      throw new TRPCError({ code: 'FORBIDDEN', message });

    return callerSessionParam(params, caller);
  };
