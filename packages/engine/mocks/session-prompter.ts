import type { PromptRequest } from '@agentclientprotocol/sdk';
import type { PromptSender } from '@repo/contracts';
import type { PluginCapability } from '@repo/contracts/plugins';
import { emptySessionInput, startAcpEngine } from './acp-engine';
import { writePlugin } from './runtime-plugins';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

type FeedRow = Awaited<
  ReturnType<Host['caller']['feed']['page']>
>['rows'][number];

const promptOperation = {
  name: 'prompt',
  label: 'Prompt a Session',
  description: 'Prompts the Session it is given.',
  tier: 'act' as const,
  params: {
    sessionId: { type: 'string' as const, description: 'Session.' },
    text: { type: 'string' as const, description: 'Text.' },
  },
  caller: ['project' as const],
};

const prompter =
  (capabilities: PluginCapability[]) =>
  (home: string): Promise<void> =>
    writePlugin(home, {
      id: 'prompter',
      name: 'Prompter',
      fixture: 'session-prompter',
      operations: [promptOperation],
      capabilities,
    });

const granted: PluginCapability[] = [{ kind: 'sessions:prompt' }];

export const text = (value: string): { type: 'text'; text: string }[] => [
  { type: 'text', text: value },
];

export type PromptJourney = {
  host: Host;
  session: Awaited<ReturnType<Host['caller']['session']['new']>>;
  requests: PromptRequest[];
  release: PromiseWithResolvers<void>;
  entered: PromiseWithResolvers<void>;
  run: (
    sessionId: string,
    message: string,
    projectId?: string,
  ) => ReturnType<Host['caller']['plugins']['run']>;
};

type Scenario = NonNullable<Parameters<typeof startAcpEngine>[0]>;

type PromptResponses = NonNullable<Scenario['responses']>['session/prompt'];

type Gate = Pick<PromptJourney, 'requests' | 'release' | 'entered'>;

// The first Turn waits at the gate; the two after it answer at once.
const turnResponses = ({
  requests,
  release,
  entered,
}: Gate): PromptResponses => [
  {
    requests,
    steps: [{ type: 'gate', waitFor: release.promise, entered }],
  },
  { requests },
  { requests },
];

const pluginPrompt =
  (host: Host): PromptJourney['run'] =>
  (sessionId, message, projectId) =>
    host.caller.plugins.run({
      pluginId: 'prompter',
      operation: 'prompt',
      args: { sessionId, text: message },
      projectId: projectId ?? emptySessionInput.projectId,
    });

const newGate = (): Gate => ({
  requests: [],
  release: Promise.withResolvers<void>(),
  entered: Promise.withResolvers<void>(),
});

// A Session whose first Turn stays open until `release` and the Plugin that may prompt it.
export async function busyJourney(
  capabilities: PluginCapability[] = granted,
): Promise<PromptJourney> {
  const gate = newGate();

  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/prompt': turnResponses(gate) },
    installPlugins: prompter(capabilities),
  });

  const session = await host.caller.session.new(emptySessionInput);

  return { ...gate, host, session, run: pluginPrompt(host) };
}

type PromptEntry = [content: string, sender: PromptSender | undefined];

type Row<Kind extends FeedRow['sessionUpdate']> = Extract<
  FeedRow,
  { sessionUpdate: Kind }
>;

const promptEntry = (row: Row<'prompt_message'>): PromptEntry => [
  JSON.stringify(row.content),
  row._meta.argo.sender,
];

const userEntry = (row: Row<'user_message'>): PromptEntry => [
  JSON.stringify(row.content),
  row._meta?.argo?.sender,
];

const entryOf = (row: FeedRow): PromptEntry[] => {
  if (row.sessionUpdate === 'prompt_message') return [promptEntry(row)];

  if (row.sessionUpdate === 'user_message') return [userEntry(row)];

  return [];
};

// The Prompts in the Feed, each with its content and sender.
export const senders = async (
  journey: PromptJourney,
): Promise<PromptEntry[]> => {
  const page = await journey.host.caller.feed.page({
    sessionId: journey.session.sessionId,
    direction: 'tail',
  });

  return page.rows.flatMap(entryOf);
};
