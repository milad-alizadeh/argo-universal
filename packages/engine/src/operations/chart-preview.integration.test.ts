import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { operationCaller, runOperation } from '#mocks/operations';

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
