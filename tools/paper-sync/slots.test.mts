import { expect, it } from 'vitest';
import { enroll } from './bind.mts';
import { node, pair } from './fixtures.mts';
import { required } from './model.mts';
import { planSync } from './plan.mts';

it('preserves independent named text overrides through wrapper insertion', () => {
  const { master, copy } = pair();
  master.nodes.push({
    ...node('detail', 'button', { text: 'Subtitle' }),
    name: 'Detail',
  });
  copy.nodes.push({
    ...node('custom', 'copy', { text: 'My detail' }),
    name: 'Detail',
  });
  required(master.nodes[0]).childIds.push('detail');
  required(copy.nodes[0]).childIds.push('custom');
  const binding = enroll(master, copy);
  master.nodes.push(node('wrap', 'button', { children: ['label', 'detail'] }));
  required(master.nodes[0]).childIds = ['wrap'];
  required(master.nodes[1]).parentId = 'wrap';
  required(master.nodes[2]).parentId = 'wrap';
  const plan = planSync(master, copy, binding);
  expect(plan.binding.textOverrides).toEqual({
    Label: 'Publish',
    Detail: 'My detail',
  });
  expect(plan.binding.nodes.detail).toBe('custom');
  expect(plan.texts).toEqual([]);
});

it('refuses an ambiguous slot name in the master', () => {
  const { master, copy } = pair();
  master.nodes.push(node('duplicate', 'button', { text: 'Other' }));
  expect(() => enroll(master, copy)).toThrow('ambiguous text slot "Label"');
});

it('plans a component larger than the former 500-node limit', () => {
  const { master, copy } = pair();

  for (let index = 0; index < 600; index += 1) {
    const source = node(`part-${index}`, 'button');
    master.nodes.push(source);
    copy.nodes.push({ ...source, id: `copy-${index}`, parentId: 'copy' });
    required(master.nodes[0]).childIds.push(source.id);
    required(copy.nodes[0]).childIds.push(`copy-${index}`);
  }

  const plan = planSync(master, copy, enroll(master, copy));
  expect(plan.creates).toEqual([]);
  expect(plan.removes).toEqual([]);
});
