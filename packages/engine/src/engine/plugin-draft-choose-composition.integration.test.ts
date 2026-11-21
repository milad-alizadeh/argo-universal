import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { expect, it } from 'vitest';
import { writeHookPlugins } from '#mocks/hook-plugins';
import { delegationJourney } from '#mocks/session-delegation';

const dev = 'dev';

const show = 'plugin.draft.show';

type Run = (input: { id: string; params: Json }) => Promise<{ kind: string }>;

const source = `export async function register() {}`;

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
async function drawing(): Promise<{
  host: Awaited<ReturnType<typeof delegationJourney>>['host'];
  sessionId: string;
  agent: (id: string, params: Json) => ReturnType<Run>;
}> {
  const journey = await delegationJourney({
    installPlugins: (home) => writeHookPlugins(home, [{ id: dev, source }]),
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

  expect(choice.sessionId).toBe(sessionId);

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
  ).rejects.toThrow(/person|Only an App|not/i);
}, 60_000);
