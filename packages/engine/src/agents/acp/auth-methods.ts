import type {
  AuthMethod,
  AuthMethodTerminal,
  InitializeResponse,
} from '@agentclientprotocol/sdk';
import type { AgentAuthState } from '@repo/contracts';

export type AuthenticationMethod = AgentAuthState['methods'][number] &
  Pick<AuthMethodTerminal, 'args' | 'env'>;

const methodType = (method: AuthMethod): string => {
  const type: unknown = 'type' in method ? method.type : 'agent';

  return typeof type === 'string' ? type : 'unsupported';
};

const supported = (method: AuthMethod): boolean =>
  methodType(method) === 'agent' || methodType(method) === 'terminal';

const isTerminal = (
  method: AuthMethod,
): method is AuthMethodTerminal & { type: 'terminal' } =>
  methodType(method) === 'terminal';

const describeMethod = (method: AuthMethod): AuthenticationMethod => {
  const result: AuthenticationMethod = {
    id: method.id,
    name: method.name,
    type: 'agent',
  };

  if (method.description != null) result.description = method.description;

  return result;
};

const terminalInvocation = (
  method: AuthMethodTerminal,
): Pick<AuthenticationMethod, 'args' | 'env'> => ({
  args: method.args ?? [],
  env: method.env ?? {},
});

const readMethod = (method: AuthMethod): AuthenticationMethod => {
  const result = describeMethod(method);

  if (isTerminal(method))
    return { ...result, type: 'terminal', ...terminalInvocation(method) };

  return result;
};

export const authenticationMethods = (
  initialization: InitializeResponse,
): AuthenticationMethod[] =>
  (initialization.authMethods ?? []).filter(supported).map(readMethod);
