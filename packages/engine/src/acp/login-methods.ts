import type { AuthMethod, InitializeResponse } from '@agentclientprotocol/sdk';
import type { LoginAgentMethod } from '../agents';

const unsupportedMethods = new Set(['api-key', 'gateway', 'chat-gpt']);
const supportsMethod = (method: AuthMethod): boolean =>
  !('type' in method && method.type === 'terminal') &&
  !unsupportedMethods.has(method.id);
export const loginMethods = (
  initialization: InitializeResponse,
): LoginAgentMethod[] =>
  (initialization.authMethods ?? []).filter(supportsMethod).map((method) => ({
    id: method.id,
    name: method.name,
    ...(method.description ? { description: method.description } : {}),
  }));
