import type {
  PatchOp,
  PatchStep,
  WireJson,
  WireNode,
} from '@repo/contracts/plugins/wire';

const same = (left: WireJson, right: WireJson): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const sameSlotNames = (left: WireNode, right: WireNode): boolean =>
  same(Object.keys(left.slots).sort(), Object.keys(right.slots).sort());

const sameIdentity = (left: WireNode, right: WireNode): boolean =>
  left.type === right.type && left.key === right.key;

const sameStructure = (left: WireNode, right: WireNode): boolean =>
  sameIdentity(left, right) &&
  left.children.length === right.children.length &&
  sameSlotNames(left, right);

const diffProps = (
  before: WireNode,
  after: WireNode,
  path: PatchStep[],
): PatchOp[] =>
  same(before.props, after.props)
    ? []
    : [{ op: 'props', path, props: after.props }];

const diffChildren = (
  before: WireNode,
  after: WireNode,
  path: PatchStep[],
): PatchOp[] =>
  after.children.flatMap((child, index) => {
    const old = before.children[index];

    return old ? diff(old, child, [...path, index]) : [];
  });

const diffSlots = (
  before: WireNode,
  after: WireNode,
  path: PatchStep[],
): PatchOp[] =>
  Object.entries(after.slots).flatMap(([name, slot]) => {
    const old = before.slots[name];

    return old ? diff(old, slot, [...path, name]) : [];
  });

// The smallest patch that turns `before` into `after`; a structural change replaces its whole subtree.
export function diff(
  before: WireNode,
  after: WireNode,
  path: PatchStep[] = [],
): PatchOp[] {
  if (!sameStructure(before, after))
    return [{ op: 'replace', path, node: after }];

  return [
    ...diffProps(before, after, path),
    ...diffChildren(before, after, path),
    ...diffSlots(before, after, path),
  ];
}
