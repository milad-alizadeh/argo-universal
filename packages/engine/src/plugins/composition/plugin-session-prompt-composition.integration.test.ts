import type { PromptRequest } from '@agentclientprotocol/sdk';
import type { PluginCapability } from '@repo/contracts/plugins';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { writePlugin } from '#mocks/runtime-plugins';
import { addOtherProject } from '#mocks/session-access';

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

const text = (value: string): { type: 'text'; text: string }[] => [
  { type: 'text', text: value },
];

// A Session whose first Turn stays open until `release` and the Plugin that may prompt it.
async function busyJourney(capabilities: PluginCapability[] = granted) {
  const release = Promise.withResolvers<void>();
  const entered = Promise.withResolvers<void>();
  const requests: PromptRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        {
          requests,
          steps: [{ type: 'gate', waitFor: release.promise, entered }],
        },
        { requests },
        { requests },
      ],
    },
    installPlugins: prompter(capabilities),
  });

  const session = await host.caller.session.new(emptySessionInput);

  const run = (sessionId: string, message: string, projectId?: string) =>
    host.caller.plugins.run({
      pluginId: 'prompter',
      operation: 'prompt',
      args: { sessionId, text: message },
      projectId: projectId ?? emptySessionInput.projectId,
    });

  return { host, session, requests, release, entered, run };
}

const senders = async (
  journey: Awaited<ReturnType<typeof busyJourney>>,
): Promise<unknown[]> => {
  const page = await journey.host.caller.feed.page({
    sessionId: journey.session.sessionId,
    direction: 'tail',
  });

  return page.rows
    .filter((row) =>
      ['prompt_message', 'user_message'].includes(row.sessionUpdate),
    )
    .map((row) => [
      JSON.stringify('content' in row ? row.content : null),
      (row._meta as { argo?: { sender?: unknown } } | undefined)?.argo?.sender,
    ]);
};

it('starts a Turn on an idle Session with the Plugin as sender and answers started', async () => {
  const journey = await busyJourney();

  await expect(
    journey.run(journey.session.sessionId, 'From plugin'),
  ).resolves.toEqual({ result: { status: 'started' } });
  await journey.entered.promise;
  expect(await senders(journey)).toEqual([
    [
      JSON.stringify(text('From plugin')),
      { type: 'plugin', pluginId: 'prompter', title: 'Prompter' },
    ],
  ]);
  journey.release.resolve();
}, 30_000);

it('queues behind the person’s queued Prompts, keeps its sender and starts when the queue reaches it', async () => {
  const journey = await busyJourney();
  await journey.run(journey.session.sessionId, 'First');
  await journey.entered.promise;
  await journey.host.caller.session.submit({
    sessionId: journey.session.sessionId,
    prompt: text('Mine'),
  });

  await expect(
    journey.run(journey.session.sessionId, 'Plugin later'),
  ).resolves.toEqual({ result: { status: 'queued' } });
  journey.release.resolve();
  await vi.waitFor(() => expect(journey.requests).toHaveLength(3));

  expect(journey.requests.map(({ prompt }) => prompt)).toEqual([
    text('First'),
    text('Mine'),
    text('Plugin later'),
  ]);
  expect((await senders(journey)).slice(1)).toEqual([
    [JSON.stringify(text('Mine')), { type: 'user' }],
    [
      JSON.stringify(text('Plugin later')),
      { type: 'plugin', pluginId: 'prompter', title: 'Prompter' },
    ],
  ]);
}, 30_000);

it('leaves a paused queue paused when it appends', async () => {
  const journey = await busyJourney();
  await journey.run(journey.session.sessionId, 'First');
  await journey.entered.promise;
  await journey.host.caller.session.submit({
    sessionId: journey.session.sessionId,
    prompt: text('Mine'),
  });
  await journey.host.caller.session.cancel(journey.session);
  await waitForAcpSnapshot(
    journey.host,
    journey.session.sessionId,
    (snapshot) => snapshot.state === 'idle' && snapshot.activeTurnId === null,
  );

  await expect(
    journey.run(journey.session.sessionId, 'Plugin later'),
  ).resolves.toEqual({ result: { status: 'queued' } });
  journey.release.resolve();
  await new Promise((resolve) => setTimeout(resolve, 300));

  expect(journey.requests).toHaveLength(1);
}, 30_000);

it('refuses and logs the call when the Plugin did not declare sessions:prompt', async () => {
  const journey = await busyJourney([]);

  await expect(journey.run(journey.session.sessionId, 'Nope')).rejects.toThrow(
    'sessions:prompt is not a declared Capability',
  );
  expect(journey.requests).toHaveLength(0);
}, 30_000);

it('refuses a Session that belongs to another Project than the call runs for', async () => {
  const journey = await busyJourney();
  const otherProject = await addOtherProject(journey.host);

  await expect(
    journey.run(journey.session.sessionId, 'Nope', otherProject),
  ).rejects.toThrow('not in the Project');
  expect(journey.requests).toHaveLength(0);
}, 30_000);
