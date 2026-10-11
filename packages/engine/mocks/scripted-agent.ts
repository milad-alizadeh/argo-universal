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
import type { AcpProcess } from '../src/acp';
import type { AgentLaunch } from '../src/agents';

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

export const createScriptedAgentWire = (
  scenario: ScriptedScenario,
  nextSessionId = (): string => 'owned-1',
): {
  stream: Stream;
  connection: AgentConnection;
  play: (steps: readonly ScriptedStep[], sessionId: string) => Promise<void>;
  sendRaw: (frame: string) => Promise<void>;
  send: (messages: readonly AnyMessage[]) => Promise<void>;
  receive: () => Promise<AnyMessage>;
  readRequest: () => Promise<AnyRequest>;
  disconnect: () => void;
} => {
  const toAgent = new TransformStream<Uint8Array, Uint8Array>();
  const fromAgent = new TransformStream<Uint8Array, Uint8Array>();
  const agent = createScriptedAgent(scenario, nextSessionId);
  const [input, observed] = toAgent.readable.tee();
  const connection = agent.connect(fromAgent.writable, input);
  const observation: Observation = {
    messages: [],
    changed: Promise.withResolvers<void>(),
  };
  void observeMessages(observed, observation).catch(() => {});
  const transport = new AbortController();
  const stream = ndJsonStream(
    toAgent.writable,
    fromAgent.readable.pipeThrough(new TransformStream(), {
      signal: transport.signal,
    }),
  );
  return {
    stream,
    connection,
    play: agent.play,
    sendRaw: agent.sendRaw,
    send: (messages) =>
      agent.sendRaw(
        messages.map((message) => JSON.stringify(message)).join('\n'),
      ),
    receive: () => receiveMessage(observation),
    readRequest: async () => {
      const message = await receiveMessage(observation);
      if (!('method' in message && 'id' in message))
        throw new Error('Expected an ACP request');
      return message;
    },
    disconnect: () => transport.abort(new Error('ACP transport broke')),
  };
};

export type ScriptedProcess = ReturnType<typeof createScriptedAgentWire> & {
  launch: AgentLaunch;
  exited: PromiseWithResolvers<void>;
  terminations: number;
};
export const requireScriptedProcessAt = (
  processes: ScriptedProcess[],
  index = 0,
): ScriptedProcess => {
  const process = processes[index];
  if (!process) throw new Error('Missing scripted Agent process');
  return process;
};

export const createScriptedAgentProcess = (
  scenario: ScriptedScenario & { autoExit?: boolean } = { steps: [] },
): {
  processes: ScriptedProcess[];
  launchProcess: (launch: AgentLaunch) => Promise<AcpProcess>;
} => {
  const processes: ScriptedProcess[] = [];
  let opened = 0;
  return {
    processes,
    launchProcess: async (launch) => {
      const wire = createScriptedAgentWire(scenario, () => `owned-${++opened}`);
      const process = {
        ...wire,
        launch,
        exited: Promise.withResolvers<void>(),
        terminations: 0,
      };
      processes.push(process);
      return {
        stream: wire.stream,
        exited: process.exited.promise,
        terminate: async () => {
          process.terminations += 1;
          wire.connection.close();
          if (scenario.autoExit !== false) process.exited.resolve();
        },
      };
    },
  };
};

export const createScriptedAgentLauncher =
  (
    scenarioFor: (launch: AgentLaunch) => ScriptedScenario,
  ): ((launch: AgentLaunch) => Promise<AcpProcess>) =>
  async (launch) =>
    createScriptedAgentProcess(scenarioFor(launch)).launchProcess(launch);
