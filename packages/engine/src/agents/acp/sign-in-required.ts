import type { ClientContext } from '@agentclientprotocol/sdk';
import { z } from 'zod';

// ACP's auth_required error code.
const authRequiredCode = -32000;

const authRequiredError = z.object({ code: z.literal(authRequiredCode) });

export const isAuthRequired = (cause: unknown): boolean =>
  authRequiredError.safeParse(cause).success;

type AgentRequest = ClientContext['request'];

const observedRequest =
  (request: AgentRequest, report: () => void) =>
  async (...args: Parameters<AgentRequest>): ReturnType<AgentRequest> => {
    try {
      return await request(...args);
    } catch (cause) {
      if (isAuthRequired(cause)) report();
      throw cause;
    }
  };

// Reports an Agent that answers any request, such as session/new or a prompt, with auth_required; the error still reaches the caller.
export const observeSignInRequired = (
  agent: ClientContext,
  report: () => void,
): ClientContext =>
  Object.assign(agent, {
    request: observedRequest(agent.request.bind(agent), report),
  });
