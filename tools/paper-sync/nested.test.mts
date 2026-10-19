import { expect, it } from 'vitest';
import { enroll } from './bind.mts';
import { node, pair } from './fixtures.mts';
import { required, type Registry, type Snapshot } from './model.mts';
import { insideOut } from './ordering.mts';
import { planSync } from './plan.mts';

type OrderingFixture = {
  families: Registry['families'];
  snapshots: Map<string, Snapshot>;
  nested: ReturnType<typeof node>;
};

function orderingFixture(): OrderingFixture {
  const { master } = pair();

  const families: Registry['families'] = ['SessionsList', 'ListItem'].map(
    (name) => ({ name, master: { fileId: 'f', nodeId: name }, copies: [] }),
  );

  const nested = { ...node('inner', 'button'), name: 'ListItem', nested: true };

  const snapshots = new Map<string, Snapshot>([
    ['SessionsList', { ...master, nodes: [...master.nodes, nested] }],
    ['ListItem', master],
  ]);

  return { families, snapshots, nested };
}

it('orders the inner master before its containing master', () => {
  const { families, snapshots } = orderingFixture();
  expect(insideOut(families, snapshots).map((family) => family.name)).toEqual([
    'ListItem',
    'SessionsList',
  ]);
});

it('rejects nested master cycles', () => {
  const { families, snapshots, nested } = orderingFixture();
  snapshots.set('ListItem', {
    fileId: 'f',
    rootId: 'inner',
    nodes: [{ ...nested, name: 'SessionsList' }],
  });
  expect(() => insideOut(families, snapshots)).toThrow('Nested master cycle');
});

it('moves a nested copy while leaving its independently owned content and state alone', () => {
  const { master, copy } = pair();
  master.nodes.push({
    ...node('inner', 'button'),
    name: 'ListItem / Default',
    nested: true,
  });
  copy.nodes.push({
    ...node('own', 'copy'),
    name: 'ListItem / Selected',
    nested: true,
  });
  required(master.nodes[0]).childIds.push('inner');
  required(copy.nodes[0]).childIds.push('own');
  const binding = enroll(master, copy);
  required(master.nodes[0]).childIds.reverse();
  const plan = planSync(master, copy, binding);
  expect(plan.binding.nodes.inner).toBe('own');
  expect(plan.removes).toEqual([]);
  expect(plan.styles).toEqual([]);
  expect(plan.moves).toContainEqual({
    sourceId: 'inner',
    parentSourceId: 'button',
    index: 0,
  });
});
