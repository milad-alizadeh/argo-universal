import type {
  AuthMethod,
  AuthMethodTerminal,
  InitializeResponse,
} from '@agentclientprotocol/sdk';
import type { AgentAuthState } from '@repo/contracts';
import { createRejectionCounter } from '@repo/machine-log';

export type AuthenticationMethod = AgentAuthState['methods'][number] &
  Pick<AuthMethodTerminal, 'args' | 'env'>;

const rejections = createRejectionCounter('ACP auth methods');

const describeMethod = (
  method: AuthMethod,
  type: AuthenticationMethod['type'],
): AuthenticationMethod => {
  const result: AuthenticationMethod = {
    id: method.id,
    name: method.name,
    type,
  };

  if (method.description != null) result.description = method.description;

  return result;
};

const terminalMethod = (method: AuthMethodTerminal): AuthenticationMethod => ({
  ...describeMethod(method, 'terminal'),
  args: method.args ?? [],
  env: method.env ?? {},
});

const ignoredMethod = (method: AuthMethod, type: string): [] => {
  rejections.report(`Ignored auth method ${method.id} of type ${type}`);

  return [];
};

// The protocol's `type` discriminator is open while the SDK union is closed: a typed method may still be `agent` or a kind Zed ignores.
const readTypedMethod = (
  method: AuthMethodTerminal,
  type: string,
): AuthenticationMethod[] => {
  if (type === 'terminal') return [terminalMethod(method)];

  return type === 'agent'
    ? [describeMethod(method, 'agent')]
    : ignoredMethod(method, type);
};

// No `type` means agent; Zed keeps agent and terminal methods in the Agent's order.
const readMethod = (method: AuthMethod): AuthenticationMethod[] =>
  'type' in method
    ? readTypedMethod(method, method.type)
    : [describeMethod(method, 'agent')];

export const authenticationMethods = (
  initialization: InitializeResponse,
): AuthenticationMethod[] =>
  (initialization.authMethods ?? []).flatMap(readMethod);
