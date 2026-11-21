import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { writeHookPlugins } from '#mocks/hook-plugins';
import { delegationJourney } from '#mocks/session-delegation';

const dev = 'dev';

const show = 'plugin.draft.show';

type Run = (input: { id: string; params: Json }) => Promise<{ kind: string }>;

const source = `export async function register() {}`;

const drafts = [
  {
    page: '/',
    states: ['populated' as const],
    regions: [
      {
        id: 'header',
        variants: [
          { id: 'compact', name: 'Compact' },
          { id: 'tabs', name: 'Tabs' },
        ],
      },
      {
        id: 'list',
        variants: [
          { id: 'rows', name: 'Rows' },
          { id: 'cards', name: 'Cards' },
        ],
      },
    ],
  },
];

const picks = [
  { region: 'header', variant: 'tabs' },
  { region: 'list', variant: 'cards' },
];

const comments = [
  {
    nodeKey: 'row-409',
    region: 'list',
    variant: 'cards',
    note: 'Use a coloured chip here, not a dot',
  },
];

// An Agent's Session that draws the dev Plugin `dev`, and the App that chooses.
async function drawing(watchPlugins = true): Promise<{
  host: Awaited<ReturnType<typeof delegationJourney>>['host'];
  sessionId: string;
  agent: (id: string, params: Json) => ReturnType<Run>;
}> {
  const journey = await delegationJourney({
    agent: { watchPlugins },
    installPlugins: (home) =>
      writeHookPlugins(home, [{ id: dev, source, drafts }]),
  });

  const { host, caller } = journey;

  const agent = (id: string, params: Json): ReturnType<Run> =>
    caller.caller.operations.run.mutate({ id, params });

  return { host, sessionId: caller.sessionId, agent };
}

type Journey = Awaited<ReturnType<typeof drawing>>;

const promptsOf = async ({ host, sessionId }: Journey): Promise<string[]> => {
  const page = await host.caller.feed.page({ sessionId, direction: 'tail' });

  return page.rows.flatMap((row) =>
    row.sessionUpdate === 'prompt_message' &&
    row._meta.argo.sender?.type === 'plugin'
      ? [JSON.stringify(row.content)]
      : [],
  );
};

it('records the pick and hands it, with its comments, to the Session whose Agent draws the Draft', async () => {
  const journey = await drawing();
  const { host, sessionId, agent } = journey;

  await agent(show, { pluginId: dev, region: 'header' });

  const choice = await host.caller.plugin.draft.choose({
    pluginId: dev,
    picks,
    comments,
  });

  expect(choice).toEqual({ sessionId, delivery: 'started' });

  await expect
    .poll(() => promptsOf(journey).then((rows) => rows.join('\n')))
    .toMatch(/header.*tabs[\s\S]*row-409[\s\S]*Use a coloured chip/);
}, 60_000);

it('reads the recorded pick back for the Agent and the App, as at the first choice', async () => {
  const { host, agent } = await drawing();

  await agent(show, { pluginId: dev });
  expect(await host.caller.plugin.draft.pick({ pluginId: dev })).toEqual({
    choice: null,
  });

  await host.caller.plugin.draft.choose({ pluginId: dev, picks, comments });

  const read = await agent('plugin.draft.pick', { pluginId: dev });

  expect(read).toMatchObject({
    kind: 'result',
    result: { choice: { picks, comments } },
  });
  expect(
    (await host.caller.plugin.draft.pick({ pluginId: dev })).choice?.picks,
  ).toEqual(picks);
}, 60_000);

it('keeps only the latest choice, one pick per region', async () => {
  const { host, agent } = await drawing();

  await agent(show, { pluginId: dev });
  await host.caller.plugin.draft.choose({ pluginId: dev, picks, comments });
  await host.caller.plugin.draft.choose({
    pluginId: dev,
    picks: [{ region: 'list', variant: 'rows' }],
  });

  expect(await host.caller.plugin.draft.pick({ pluginId: dev })).toMatchObject({
    choice: { picks: [{ region: 'list', variant: 'rows' }], comments: [] },
  });
  await expect(
    host.caller.plugin.draft.choose({
      pluginId: dev,
      picks: [...picks.slice(0, 1), ...picks.slice(0, 1)],
    }),
  ).rejects.toThrow(/picked once/);
}, 60_000);

it('refuses a choice no Agent is drawing, and never lets an Agent choose', async () => {
  const { host, agent } = await drawing();

  await expect(
    host.caller.plugin.draft.choose({ pluginId: dev, picks, comments }),
  ).rejects.toThrow(/plugin\.draft\.show/);

  await agent(show, { pluginId: dev });
  await expect(
    agent('plugin.draft.choose', { pluginId: dev, picks }),
  ).rejects.toThrow(/Only an App can run plugin\.draft\.choose/);
}, 60_000);

it('refuses an Agent that records another Session as the one drawing', async () => {
  const { host, agent } = await drawing();
  const other = await host.caller.session.new(emptySessionInput);

  await expect(
    agent(show, { pluginId: dev, sessionId: other.sessionId }),
  ).rejects.toThrow(/records only itself/);
  await expect(
    host.caller.plugin.draft.choose({ pluginId: dev, picks }),
  ).rejects.toThrow(/plugin\.draft\.show/);
}, 60_000);

it('refuses a pick for a region or Variant the Draft does not declare', async () => {
  const { host, agent } = await drawing();

  await agent(show, { pluginId: dev });
  await expect(
    host.caller.plugin.draft.choose({
      pluginId: dev,
      picks: [{ region: 'footer', variant: 'tabs' }],
    }),
  ).rejects.toThrow(/no region footer/);
  await expect(
    host.caller.plugin.draft.choose({
      pluginId: dev,
      picks: [{ region: 'header', variant: 'grid' }],
    }),
  ).rejects.toThrow(/no Variant grid/);
  expect(await host.caller.plugin.draft.pick({ pluginId: dev })).toEqual({
    choice: null,
  });
}, 60_000);

it('does not read the last Session’s choice back once another Session draws', async () => {
  const { host, agent, sessionId } = await drawing();
  const other = await host.caller.session.new(emptySessionInput);

  await agent(show, { pluginId: dev });
  await host.caller.plugin.draft.choose({ pluginId: dev, picks, comments });

  await host.caller.plugin.draft.show({
    pluginId: dev,
    sessionId: other.sessionId,
  });

  expect(await host.caller.plugin.draft.pick({ pluginId: dev })).toEqual({
    choice: null,
  });
  expect(
    await host.caller.plugin.draft.choose({ pluginId: dev, picks }),
  ).toMatchObject({ sessionId: other.sessionId });
  expect(other.sessionId).not.toBe(sessionId);
}, 60_000);

it('refuses a Choose for a Plugin the Server does not run as a dev Plugin', async () => {
  const { host, agent } = await drawing(false);

  await expect(agent(show, { pluginId: dev })).rejects.toThrow(/--watch/);
  await expect(
    host.caller.plugin.draft.choose({ pluginId: dev, picks }),
  ).rejects.toThrow(/not a dev Plugin/);
}, 60_000);

it('hands comments on nodes outside any region to the Agent, with no pick', async () => {
  const { host, agent } = await drawing();
  const outside = [{ nodeKey: 'title', note: 'Make the title bigger' }];

  await agent(show, { pluginId: dev });
  await host.caller.plugin.draft.choose({
    pluginId: dev,
    picks: [],
    comments: outside,
  });

  expect(
    await agent('plugin.draft.pick', { pluginId: dev }),
  ).toMatchObject({
    kind: 'result',
    result: { choice: { picks: [], comments: outside } },
  });
}, 60_000);

it('refuses a comment in a region or Variant the Draft does not declare', async () => {
  const { host, agent } = await drawing();
  const note = 'Too tall';

  await agent(show, { pluginId: dev });
  await expect(
    host.caller.plugin.draft.choose({
      pluginId: dev,
      picks,
      comments: [{ nodeKey: 'a', region: 'footer', variant: 'rows', note }],
    }),
  ).rejects.toThrow(/no region footer/);
  await expect(
    host.caller.plugin.draft.choose({
      pluginId: dev,
      picks,
      comments: [{ nodeKey: 'a', region: 'list', variant: 'grid', note }],
    }),
  ).rejects.toThrow(/no Variant grid/);
  await expect(
    host.caller.plugin.draft.choose({
      pluginId: dev,
      picks,
      comments: [{ nodeKey: 'a', variant: 'rows', note }],
    }),
  ).rejects.toThrow(/Variant rows without a region/);
  expect(await host.caller.plugin.draft.pick({ pluginId: dev })).toEqual({
    choice: null,
  });
}, 60_000);
