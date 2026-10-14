import type { ClientContext } from '@agentclientprotocol/sdk';

// ACP's auth_required error code.
const authRequiredCode = -32000;

const isAuthRequired = (error: unknown): boolean =>
  Reflect.get(Object(error), 'code') === authRequiredCode;

const observedRequest =
  (agent: ClientContext, report: () => void) =>
  async (...args: Parameters<ClientContext['request']>): Promise<unknown> => {
    try {
      return await agent.request(...args);
    } catch (error) {
      if (isAuthRequired(error)) report();
      throw error;
    }
  };

// Reports an Agent that answers any request, such as session/new or a prompt, with auth_required; the error still reaches the caller.
export const observeSignInRequired = (
  agent: ClientContext,
  report: () => void,
): ClientContext => {
  const request = observedRequest(agent, report);
  return new Proxy(agent, {
    get: (target, key) => {
      if (key === 'request') return request;
      const value: unknown = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
};
