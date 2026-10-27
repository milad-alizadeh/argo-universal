import type { PatchOp, PatchStep, WireJson, WireNode } from './wire';
import { diffChildren } from './wire-diff-children';

const same = (left: WireJson | undefined, right: WireJson): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

function propsChanged(
  before: WireNode,
  after: WireNode,
  key: PatchStep[],
): PatchOp[] {
  const props = changedProps(before, after);

  const unset = Object.keys(before.props).filter(
    (name) => !(name in after.props),
  );

  if (Object.keys(props).length === 0 && unset.length === 0) return [];

  return [{ op: 'setProps', key, props, unset: removedProps(unset) }];
}

function slotsChanged(
  before: WireNode,
  after: WireNode,
  parent: PatchStep[],
): PatchOp[] {
  const names = Object.keys({ ...before.slots, ...after.slots });
  const context = { parent, compare: diff };

  return names.flatMap((slot) =>
    diffChildren(before.slots[slot] ?? [], after.slots[slot] ?? [], {
      ...context,
      slot,
    }),
  );
}

const sameIdentity = (before: WireNode, after: WireNode): boolean =>
  before.type === after.type && before.key === after.key;

// Author keys retain identity; generated position keys retain positional matching.
export function diff(
  before: WireNode,
  after: WireNode,
  key: PatchStep[] = [],
): PatchOp[] {
  if (!sameIdentity(before, after))
    return [{ op: 'replace', key, node: after }];

  const collection = { parent: key, compare: diff };

  return [
    ...propsChanged(before, after, key),
    ...diffChildren(before.children, after.children, collection),
    ...slotsChanged(before, after, key),
  ];
}

const removedProps = (names: string[]): string[] | undefined =>
  names.length ? names : undefined;

function changedProps(before: WireNode, after: WireNode): WireNode['props'] {
  return Object.fromEntries(
    Object.entries(after.props).filter(
      ([name, value]) => !same(before.props[name], value),
    ),
  );
}
