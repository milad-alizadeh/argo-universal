import {
  ndJsonStream,
  type AnyMessage,
  type AnyRequest,
  type AgentConnection,
  type Stream,
} from '@agentclientprotocol/sdk';
import { createScriptedAgent } from '@repo/mocks/agent/scripted-agent';
import type {
  ScriptedScenario,
  ScriptedStep,
} from '@repo/mocks/agent/scripted-scenario';

type Observation = {
  messages: AnyMessage[];
  changed: PromiseWithResolvers<void>;
};

const recordMessage = (observation: Observation, message: AnyMessage): void => {
  observation.messages.push(message);
  observation.changed.resolve();
  observation.changed = Promise.withResolvers<void>();
};

const receiveMessage = async (
  observation: Observation,
): Promise<AnyMessage> => {
  while (!observation.messages.length) await observation.changed.promise;
  const message = observation.messages.shift();

  if (!message) throw new Error('Scripted Agent observation is missing');

  return message;
};

const observeMessages = async (
  readable: ReadableStream<Uint8Array>,
  observation: Observation,
): Promise<void> => {
  const reader = ndJsonStream(
    new WritableStream(),
    readable,
  ).readable.getReader();

  while (true) {
    const next = await reader.read();

    if (next.done) return;
    recordMessage(observation, next.value);
  }
};

interface ScriptedAgentWire {
  stream: Stream;
  connection: AgentConnection;
  play: (steps: readonly ScriptedStep[], sessionId: string) => Promise<void>;
  sendRaw: (frame: string) => Promise<void>;
  send: (messages: readonly AnyMessage[]) => Promise<void>;
  receive: () => Promise<AnyMessage>;
  readRequest: () => Promise<AnyRequest>;
  disconnect: () => void;
}

type ScriptedAgent = ReturnType<typeof createScriptedAgent>;

type WireStreams = {
  toAgent: TransformStream<Uint8Array, Uint8Array>;
  fromAgent: TransformStream<Uint8Array, Uint8Array>;
  input: ReadableStream<Uint8Array>;
  observed: ReadableStream<Uint8Array>;
};

export const createScriptedAgentWire = (
  scenario: ScriptedScenario,
  nextSessionId = (): string => 'owned-1',
  exit?: (code: number, stderr: string) => Promise<void>,
): ScriptedAgentWire => {
  const streams = wireStreams();
  const agent = createScriptedAgent(scenario, nextSessionId, exit && { exit });
  const connection = agent.connect(streams.fromAgent.writable, streams.input);
  const observation = startObservation(streams.observed);
  const transport = new AbortController();

  return wireInterface({ agent, connection, streams, observation, transport });
};

const wireStreams = (): WireStreams => {
  const toAgent = new TransformStream<Uint8Array, Uint8Array>();
  const fromAgent = new TransformStream<Uint8Array, Uint8Array>();
  const [input, observed] = toAgent.readable.tee();

  return { toAgent, fromAgent, input, observed };
};

const startObservation = (
  readable: ReadableStream<Uint8Array>,
): Observation => {
  const observation: Observation = {
    messages: [],
    changed: Promise.withResolvers<void>(),
  };

  void observeMessages(readable, observation).catch(() => {});

  return observation;
};

type WireParts = {
  agent: ScriptedAgent;
  connection: AgentConnection;
  streams: WireStreams;
  observation: Observation;
  transport: AbortController;
};

const wireInterface = (parts: WireParts): ScriptedAgentWire => ({
  stream: clientStream(parts.streams, parts.transport),
  connection: parts.connection,
  play: parts.agent.play,
  sendRaw: parts.agent.sendRaw,
  send: (messages) =>
    parts.agent.sendRaw(
      messages.map((message) => JSON.stringify(message)).join('\n'),
    ),
  receive: () => receiveMessage(parts.observation),
  readRequest: () => readRequest(parts.observation),
  disconnect: () => parts.transport.abort(new Error('ACP transport broke')),
});

const clientStream = (
  streams: WireStreams,
  transport: AbortController,
): Stream =>
  ndJsonStream(
    streams.toAgent.writable,
    streams.fromAgent.readable.pipeThrough(new TransformStream(), {
      signal: transport.signal,
    }),
  );

const readRequest = async (observation: Observation): Promise<AnyRequest> => {
  const message = await receiveMessage(observation);

  if (!('method' in message && 'id' in message))
    throw new Error('Expected an ACP request');

  return message;
};
