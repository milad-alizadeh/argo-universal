import type { PromptRequest } from '@agentclientprotocol/sdk';
import type { SentPromptSender } from '@repo/contracts';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { recordingSource, writeHookPlugins } from '#mocks/hook-plugins';
import { sessionSources } from '#mocks/session-sources';
import { steeringScenario, type Scenario } from '#mocks/conversation-agent';
import { OpenSessions } from '../open-sessions';
import { sendPrompt, type SentPrompt } from '.';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

export const senders = {
  'the Conversation': { type: 'conversation' },
  'another Session': { type: 'session', sessionId: 'caller', title: 'Caller' },
  'a Plugin': { type: 'plugin', pluginId: 'prompter', title: 'Prompter' },
} satisfies Record<string, SentPromptSender>;

const longJob = 'Long job';

export type SendingJourney = {
  // The Prompts the Agent took as Turns of their own.
  requests: PromptRequest[];
  // What the Agent was steered with.
  steered: Promise<unknown>;
  // Starts a Turn that runs until `release`, and answers with its id.
  busy: () => Promise<string>;
  release: () => void;
  send: (text: string, sender: SentPromptSender) => Promise<SentPrompt>;
};

export type SendingOptions = {
  steering?: boolean | 'refused';
  // A `prompt.submit` Hook drops every Prompt, saying this.
  drop?: string;
};

const dropping =
  (drop: string) =>
  (home: string): Promise<void> =>
    writeHookPlugins(home, [
      {
        id: 'drop-prompts',
        hooks: ['prompt.submit'],
        source: recordingSource(
          `await on('prompt.submit', () => ({ drop: ${JSON.stringify(drop)} }));`,
        ),
      },
    ]);

type Gate = {
  requests: PromptRequest[];
  release: PromiseWithResolvers<void>;
  steered: PromiseWithResolvers<unknown>;
};

const newGate = (): Gate => ({
  requests: [],
  release: Promise.withResolvers<void>(),
  steered: Promise.withResolvers<unknown>(),
});

// The long job holds its Turn until released; every other Prompt is recorded and answered at once.
const scenarioOf = (gate: Gate, options: SendingOptions): Scenario => ({
  steps: [],
  responses: {
    'session/prompt': [
      {
        prompt: longJob,
        steps: [{ type: 'gate', waitFor: gate.release.promise }],
      },
      { requests: gate.requests },
      { requests: gate.requests },
    ],
  },
  ...steeringScenario(gate.steered, options.steering),
  installPlugins:
    options.drop === undefined ? undefined : dropping(options.drop),
});

const openSources = (host: Host): Parameters<typeof sendPrompt>[0] => {
  const sources = sessionSources(host.openSessions);

  return { ...sources, open: new OpenSessions(sources) };
};

const busyTurn =
  (host: Host, sessionId: string) => async (): Promise<string> => {
    await host.caller.session.prompt({
      sessionId,
      prompt: [{ type: 'text', text: longJob }],
    });

    const running = await waitForAcpSnapshot(
      host,
      sessionId,
      ({ activeTurnId }) => activeTurnId !== null,
    );

    return running.activeTurnId ?? '';
  };

const sender =
  (host: Host, sessionId: string): SendingJourney['send'] =>
  (text, from) =>
    sendPrompt(
      openSources(host),
      { sessionId, prompt: [{ type: 'text', text }] },
      { sender: from },
    );

// A Session that Prompts are sent to, with an Agent that may be steered and a Turn the test may hold open.
export async function sendingJourney(
  options: SendingOptions = {},
): Promise<SendingJourney> {
  const gate = newGate();
  const host = await startAcpEngine(scenarioOf(gate, options));
  const { sessionId } = await host.caller.session.new(emptySessionInput);

  return {
    requests: gate.requests,
    steered: gate.steered.promise,
    busy: busyTurn(host, sessionId),
    release: () => gate.release.resolve(),
    send: sender(host, sessionId),
  };
}
