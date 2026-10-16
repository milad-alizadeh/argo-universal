import {
  type ClientRequestHandlersByMethod,
  client,
} from '@agentclientprotocol/sdk';

export type TerminalRequests = Pick<
  ClientRequestHandlersByMethod,
  | 'terminal/create'
  | 'terminal/output'
  | 'terminal/kill'
  | 'terminal/wait_for_exit'
  | 'terminal/release'
>;

export const routeTerminalRequests = (
  destination: (sessionId: string) => TerminalRequests | undefined,
): TerminalRequests =>
  terminalHandlers((sessionId) =>
    requireTerminalDestination(destination(sessionId)),
  );

const terminalHandlers = (
  requireDestination: (sessionId: string) => TerminalRequests,
): TerminalRequests => {
  return {
    'terminal/create': (context) =>
      requireDestination(context.params.sessionId)['terminal/create'](context),
    'terminal/output': (context) =>
      requireDestination(context.params.sessionId)['terminal/output'](context),
    'terminal/kill': (context) =>
      requireDestination(context.params.sessionId)['terminal/kill'](context),
    'terminal/wait_for_exit': forwardTerminalWait(requireDestination),
    'terminal/release': (context) =>
      requireDestination(context.params.sessionId)['terminal/release'](context),
  };
};

const requireTerminalDestination = (
  requests: TerminalRequests | undefined,
): TerminalRequests => {
  if (!requests) throw new Error('No terminal service for this Agent session');

  return requests;
};

export const acceptTerminalRequests = (
  builder: ReturnType<typeof client>,
  requests?: TerminalRequests,
): ReturnType<typeof client> => {
  const handlers = requests ?? routeTerminalRequests(() => {});

  return builder
    .onRequest('terminal/create', handlers['terminal/create'])
    .onRequest('terminal/output', handlers['terminal/output'])
    .onRequest('terminal/kill', handlers['terminal/kill'])
    .onRequest('terminal/wait_for_exit', handlers['terminal/wait_for_exit'])
    .onRequest('terminal/release', handlers['terminal/release']);
};

const forwardTerminalWait =
  (
    destination: (sessionId: string) => TerminalRequests,
  ): TerminalRequests['terminal/wait_for_exit'] =>
  (context) =>
    destination(context.params.sessionId)['terminal/wait_for_exit'](context);
