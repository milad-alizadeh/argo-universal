import { expect, it } from 'vitest';
import { enroll } from './bind.mts';
import { boundaryNames, rejectAmbiguous } from './boundaries.mts';
import { node, pair } from './fixtures.mts';
import { required, type Registry } from './model.mts';
import { htmlFor } from './node-html.mts';
import { planSync } from './plan.mts';

it('refuses to discard hidden peers whose identity is ambiguous', () => {
  const { master, copy } = pair();
  master.nodes = [
    node('button', null, { children: ['a', 'b', 'c'] }),
    ...['a', 'b', 'c'].map((id) => ({ ...node(id, 'button'), name: 'Part' })),
  ];
  copy.nodes = [
    node('copy', null, { children: ['x', 'y'] }),
    ...['x', 'y'].map((id) => ({
      ...node(id, 'copy'),
      name: 'Part',
      isVisible: id !== 'x',
    })),
  ];
  const binding = enroll(master, copy);
  expect(() => planSync(master, copy, binding)).toThrow(
    'Cannot remove unmatched hidden or nested layer',
  );
});

it('refuses to delete an independently owned nested copy', () => {
  const { master, copy } = pair();
  copy.nodes.push({ ...node('inner', 'copy'), name: 'ListItem', nested: true });
  required(copy.nodes[0]).childIds.push('inner');
  const binding = enroll(master, copy);
  expect(() => planSync(master, copy, binding)).toThrow(
    'Cannot remove unmatched hidden or nested layer',
  );
});

it('retains ambiguous master boundaries and blocks their containing components', () => {
  const registry: Registry = {
    version: 1,
    families: [],
    ambiguousNames: ['ListItem'],
  };

  const { master } = pair();
  master.nodes.push({
    ...node('inner', 'button'),
    name: 'ListItem',
    nested: true,
  });
  expect(boundaryNames(registry).has('ListItem')).toBe(true);
  expect(() => rejectAmbiguous(master, registry)).toThrow(
    'Ambiguous master name: ListItem',
  );
});

it('rejects hidden SVG insertion before it can reveal a hidden layer', () => {
  const hidden = {
    ...node('icon', 'root'),
    component: 'SVG',
    isVisible: false,
    svg: '<svg viewBox="0 0 10 10"></svg>',
  };

  expect(() => htmlFor(hidden)).toThrow(
    'Creating hidden layers is not supported',
  );
});
