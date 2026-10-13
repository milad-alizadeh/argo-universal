import type {
  AuthMethod,
  AuthMethodTerminal,
  InitializeResponse,
} from '@agentclientprotocol/sdk';
import type { LoginAgentMethod } from '..';

const unsupportedMethods = new Set(['api-key', 'gateway', 'chat-gpt']);

const isTerminal = (
  method: AuthMethod,
): method is AuthMethodTerminal & { type: 'terminal' } =>
  'type' in method && method.type === 'terminal';

const terminalInvocation = (
  method: AuthMethodTerminal,
): NonNullable<LoginAgentMethod['terminal']> => ({
  args: method.args ?? [],
  env: method.env ?? {},
});

const terminalMethod = (
  method: AuthMethod,
): Pick<LoginAgentMethod, 'terminal'> =>
  isTerminal(method) ? { terminal: terminalInvocation(method) } : {};

const loginMethod = (method: AuthMethod): LoginAgentMethod => {
  const login: LoginAgentMethod = {
    id: method.id,
    name: method.name,
    ...terminalMethod(method),
  };

  if (method.description) login.description = method.description;

  return login;
};

const eligibleMethods = (initialization: InitializeResponse): AuthMethod[] =>
  (initialization.authMethods ?? []).filter(
    (method) => !unsupportedMethods.has(method.id),
  );

const selectLoginMethods = (
  methods: AuthMethod[],
  terminalSupported: boolean,
): AuthMethod[] => {
  const protocol = methods.filter((method) => !isTerminal(method));

  if (protocol.length) return protocol;

  return terminalSupported ? methods : [];
};

export const loginMethods = (
  initialization: InitializeResponse,
  terminalSupported = false,
): LoginAgentMethod[] =>
  selectLoginMethods(eligibleMethods(initialization), terminalSupported).map(
    loginMethod,
  );
