import { expect, it } from 'vitest';
import {
  chartPreviewImage,
  connectChartPreviewApp,
} from '#mocks/chart-preview-app';
import { startEngineTestHost } from '#mocks/engine';
import { operationCaller, runOperation } from '#mocks/operations';
import { openAccessSession, sessionAccessHost } from '#mocks/session-access';

const operationId = 'chart.preview';

const validFence = [
  '```chart',
  '{"kind":"line","label":"Weekly deliveries","series":[{"name":"Delivered","tone":"info","points":[{"x":1,"y":12},{"x":2,"y":19}]}]}',
  '```',
].join('\n');

async function preview(fence: string): ReturnType<typeof runOperation> {
  const host = await startEngineTestHost({ fixtureAgents: [] });
  const caller = await operationCaller(host);

  return runOperation(caller.operations, {
    id: operationId,
    params: { fence },
  });
}

it('passes a complete Chart fence when no desktop renderer is connected', async () => {
  expect(await preview(validFence)).toEqual({
    valid: true,
    status: 'unavailable',
    reason: 'No desktop Chart renderer is available on this Server.',
  });
});

it('names an invalid point and an excluded action in the submitted fence', async () => {
  const invalidFence = validFence
    .replace('"series":', '"onPress":null,"series":')
    .replace('"y":12', '"y":"twelve"');

  expect(await preview(invalidFence)).toEqual({
    valid: false,
    problems: expect.arrayContaining([
      {
        path: ['series', 0, 'points', 0, 'y'],
        message: expect.any(String),
      },
      { path: ['onPress'], message: expect.any(String) },
    ]),
  });
});

it('rejects the same JSON when the fence is still open', async () => {
  expect(await preview(validFence.split('\n').slice(0, -1).join('\n'))).toEqual(
    {
      valid: false,
      problems: [
        {
          path: [],
          message: expect.stringContaining('complete chart fence'),
        },
      ],
    },
  );
});

it('discovers the accepted fields and a copyable fence', async () => {
  const host = await startEngineTestHost({ fixtureAgents: [] });
  const { operations } = await operationCaller(host);
  const listed = await operations.list.query({ filter: 'preview chart fence' });

  expect(listed).toContainEqual(
    expect.objectContaining({ id: operationId, enabled: true }),
  );

  const [entry] = await operations.inputSchema.query({ id: operationId });
  expect(entry?.params).toMatchObject({
    properties: {
      fence: {
        description: expect.stringContaining('stacked and grid'),
        examples: [validFence],
      },
    },
  });

  expect(
    await runOperation(operations, {
      id: operationId,
      params: { fence: validFence },
    }),
  ).toMatchObject({ valid: true });
});

it('returns a capture from the local desktop renderer at the requested width and theme', async () => {
  const host = await startEngineTestHost({ fixtureAgents: [] });
  const app = connectChartPreviewApp(host.url);

  await app.ready;

  const { operations } = await operationCaller(host);

  const draft = { fence: validFence, width: 360, theme: 'dark' };

  expect(
    await runOperation(operations, { id: operationId, params: draft }),
  ).toEqual({
    valid: true,
    status: 'captured',
    platform: 'web',
    width: 360,
    theme: 'dark',
    image: chartPreviewImage,
  });
  expect(app.drafts).toEqual([draft]);
});

it('reports when the renderer cannot paint the Chart, without reporting a capture', async () => {
  const host = await startEngineTestHost({ fixtureAgents: [] });

  const app = connectChartPreviewApp(host.url, {
    status: 'unavailable',
    reason: 'The Chart drawing did not finish.',
  });

  await app.ready;

  const { operations } = await operationCaller(host);

  expect(
    await runOperation(operations, {
      id: operationId,
      params: { fence: validFence },
    }),
  ).toEqual({
    valid: true,
    status: 'unavailable',
    reason: 'The Chart drawing did not finish.',
  });
  expect(app.drafts).toEqual([
    { fence: validFence, width: 390, theme: 'light' },
  ]);
});

it('records the Chart preview status without attaching the PNG to the Feed', async () => {
  const fixture = await sessionAccessHost();
  const app = connectChartPreviewApp(fixture.host.url);

  await app.ready;

  const session = await openAccessSession(fixture, 'Preview a Chart');

  expect(
    await runOperation(session.caller.operations, {
      id: operationId,
      params: { fence: validFence },
    }),
  ).toMatchObject({ status: 'captured', image: chartPreviewImage });

  await expect
    .poll(async () => {
      const page = await fixture.host.caller.feed.page({
        sessionId: session.sessionId,
        direction: 'tail',
      });

      return page.rows.find(
        (row) =>
          row.sessionUpdate === 'tool_call_update' && row.name === operationId,
      );
    })
    .toMatchObject({
      rawOutput: { valid: true, status: 'captured' },
    });

  const feed = await fixture.host.caller.feed.page({
    sessionId: session.sessionId,
    direction: 'tail',
  });

  expect(JSON.stringify(feed)).not.toContain(chartPreviewImage.data);
}, 30_000);
