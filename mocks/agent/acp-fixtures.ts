import { randomUUID } from 'node:crypto';
import {
  agent,
  ndJsonStream,
  type AgentApp,
  type AgentRequestHandlersByMethod,
  type Stream,
  type SessionConfigOption,
} from '@agentclientprotocol/sdk';
import { acpConfiguration } from './acp-configuration';
import { AppFixtureOptions, type AppFixtureAgents } from './app-fixtures';
import { imageReply, sharedReply } from './app-stream';

type AppFixtureProcess = {
  stream: Stream;
  exited: Promise<void>;
  terminate: () => Promise<void>;
};
const createPromptReplyHandler =
  (
    scenario: AppFixtureOptions['scenario'],
  ): AgentRequestHandlersByMethod['session/prompt'] =>
  async ({ params, client }) => {
    await client.notify('session/update', {
      sessionId: params.sessionId,
      update: {
        sessionUpdate: 'agent_message_chunk',
        content: {
          type: 'text',
          text: scenario === 'image' ? imageReply : sharedReply,
        },
      },
    });
    return { stopReason: 'end_turn' };
  };
const createAppFixtureAgentApp = (
  scenario: AppFixtureOptions['scenario'],
): AgentApp => {
  const sessions = new Map<string, SessionConfigOption[]>();
  return agent()
    .onRequest('initialize', () => ({
      protocolVersion: 1,
      agentCapabilities: {
        promptCapabilities: { image: true },
        loadSession: true,
        sessionCapabilities: { close: {}, resume: {} },
      },
    }))
    .onRequest('session/new', () => {
      const sessionId = randomUUID();
      sessions.set(sessionId, acpConfiguration);
      return { sessionId, configOptions: acpConfiguration };
    })
    .onRequest('session/set_config_option', ({ params }) => {
      const configOptions = (sessions.get(params.sessionId) ?? []).map(
        (option): SessionConfigOption => {
          if (option.id !== params.configId) return option;
          if (option.type === 'boolean' && typeof params.value === 'boolean')
            return { ...option, currentValue: params.value };
          if (option.type === 'select' && typeof params.value === 'string')
            return { ...option, currentValue: params.value };
          throw new Error('Wrong configuration value type');
        },
      );
      sessions.set(params.sessionId, configOptions);
      return { configOptions };
    })
    .onRequest('session/close', () => ({}))
    .onRequest('session/resume', () => ({}))
    .onRequest('session/load', () => ({}))
    .onRequest('session/prompt', createPromptReplyHandler(scenario));
};
const connectAppFixtureProcess = (peer: AgentApp): AppFixtureProcess => {
  const outgoing = new TransformStream<Uint8Array, Uint8Array>();
  const incoming = new TransformStream<Uint8Array, Uint8Array>();
  const connection = peer.connect(
    ndJsonStream(incoming.writable, outgoing.readable),
  );
  const exited = Promise.withResolvers<void>();
  return {
    stream: ndJsonStream(outgoing.writable, incoming.readable),
    exited: exited.promise,
    terminate: async () => {
      connection.close();
      exited.resolve();
    },
  };
};
export const createAppFixtureProcessLauncher =
  (
    options: AppFixtureAgents,
  ): ((launch: { agentId: string }) => Promise<AppFixtureProcess>) =>
  async ({ agentId }) =>
    connectAppFixtureProcess(
      createAppFixtureAgentApp(
        AppFixtureOptions.parse(options[agentId] ?? {}).scenario,
      ),
    );
