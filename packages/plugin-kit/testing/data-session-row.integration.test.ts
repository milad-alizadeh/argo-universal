import { expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';

const slotId = 'argo/session/row/v1';

it('shares a list Query across Session rows and draws only the existing meta parts', async () => {
  const fixture = await dataFixture(
    `import { Label, Pill, Button, useData } from '@argo/plugin-kit';
    export function register(argo) {
      argo.slots.register('${slotId}', ({ context }) => {
        const { data } = useData({ api: 'process', action: 'run', argv: ['query-fixture'] });
        return <><Label text={context.sessionId + ':' + (data?.stdout ?? 'empty')} /><Button label="Forbidden" /><Pill text={context.branch ?? 'detached'} tone="done" /></>;
      });
    }`,
    { slots: [slotId] },
  );

  const kit = await fixture.start();

  const first = kit.slot({
    slotId,
    context: { projectId: 'one', sessionId: 'first', branch: 'first-branch' },
  });

  await first.find('first:1');
  await first.find('first-branch');

  const second = kit.slot({
    slotId,
    context: { projectId: 'one', sessionId: 'second', branch: 'second-branch' },
  });

  await second.find('second:1');
  await second.find('second-branch');
  expect(first.findText('Forbidden')).toBeUndefined();
  expect(second.findText('Forbidden')).toBeUndefined();
  expect(first.tree?.children.map(({ type }) => type)).toEqual([
    'Label',
    'Pill',
  ]);
  expect(await fixture.requests()).toHaveLength(1);
  expect(await kit.log()).toContain('refused argo/session/row/v1 part Button');
});

it('makes a separate call for each Query built from a Session row context', async () => {
  const fixture = await dataFixture(
    `import { Label, useData } from '@argo/plugin-kit';
    export function register(argo) {
      argo.slots.register('${slotId}', ({ context }) => {
        const { data } = useData({ api: 'process', action: 'run', argv: ['query-fixture', context.branch] });
        return <Label text={data?.stdout ?? 'empty'} />;
      });
    }`,
    { slots: [slotId] },
  );

  const kit = await fixture.start();

  const first = kit.slot({
    slotId,
    context: { projectId: 'one', sessionId: 'first', branch: 'one' },
  });

  await first.find('1');

  const second = kit.slot({
    slotId,
    context: { projectId: 'one', sessionId: 'second', branch: 'two' },
  });

  await second.find('2');
  expect(
    (await fixture.requests()).map((line) => JSON.parse(line).args),
  ).toEqual([['one'], ['two']]);
});
