import type {
  AgentRequestParamsByMethod,
  AgentRequestResponsesByMethod,
} from '@agentclientprotocol/sdk';

type ResponseExample<Method extends keyof AgentRequestResponsesByMethod> = {
  method: Method;
  params: AgentRequestParamsByMethod[Method];
  response: AgentRequestResponsesByMethod[Method];
};

export const acpResponses = {
  initialize: {
    method: 'initialize',
    params: { protocolVersion: 1 },
    response: { protocolVersion: 1, agentCapabilities: {}, authMethods: [] },
  } satisfies ResponseExample<'initialize'>,
  authenticate: {
    method: 'authenticate',
    params: { methodId: 'subscription' },
    response: {},
  } satisfies ResponseExample<'authenticate'>,
  newSession: {
    method: 'session/new',
    params: { cwd: '/checkout', mcpServers: [] },
    response: { sessionId: 'one', _meta: { opaque: { preserve: true } } },
  } satisfies ResponseExample<'session/new'>,
  loadSession: {
    method: 'session/load',
    params: { cwd: '/checkout', mcpServers: [], sessionId: 'one' },
    response: {},
  } satisfies ResponseExample<'session/load'>,
  resumeSession: {
    method: 'session/resume',
    params: { cwd: '/checkout', mcpServers: [], sessionId: 'one' },
    response: {},
  } satisfies ResponseExample<'session/resume'>,
  closeSession: {
    method: 'session/close',
    params: { sessionId: 'one' },
    response: {},
  } satisfies ResponseExample<'session/close'>,
  setSessionMode: {
    method: 'session/set_mode',
    params: { sessionId: 'one', modeId: 'plan' },
    response: {},
  } satisfies ResponseExample<'session/set_mode'>,
  setSessionConfigOption: {
    method: 'session/set_config_option',
    params: { sessionId: 'one', configId: 'fast', value: 'on' },
    response: { configOptions: [] },
  } satisfies ResponseExample<'session/set_config_option'>,
  prompt: {
    method: 'session/prompt',
    params: { sessionId: 'one', prompt: [{ type: 'text', text: 'Start' }] },
    response: { stopReason: 'end_turn' },
  } satisfies ResponseExample<'session/prompt'>,
};
