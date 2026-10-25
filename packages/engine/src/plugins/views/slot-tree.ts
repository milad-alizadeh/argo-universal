import { wireParts } from '@repo/contracts/plugins/kit';
import {
  slotContentRule,
  type SlotContentRule,
  type WireNode,
} from '@repo/contracts/plugins/wire';

type Refused = (type: string) => void;

// A Slot that takes only one kit slot's parts gets a row of those parts; any other Slot keeps its tree.
export function prepareSlotTree(
  slotId: string | undefined,
  root: WireNode,
  refused: Refused,
): WireNode {
  const rule = slotContentRule(slotId);

  return rule === 'tree' ? root : partRow(root, acceptedParts(rule), refused);
}

function acceptedParts(
  rule: Exclude<SlotContentRule, 'tree'>,
): readonly string[] {
  const kitSlots: Record<string, readonly string[]> =
    wireParts[rule.part].slots;

  return kitSlots[rule.slot] ?? [];
}

function partRow(
  root: WireNode,
  parts: readonly string[],
  refused: Refused,
): WireNode {
  return {
    type: 'Stack',
    key: root.key,
    props: { direction: 'row' },
    children: topNodes(root).filter((node) =>
      allowedPart(parts, node, refused),
    ),
    slots: {},
  };
}

function topNodes(root: WireNode): WireNode[] {
  return root.type === 'Stack' ? root.children : [root];
}

function allowedPart(
  parts: readonly string[],
  node: WireNode,
  refused: Refused,
): boolean {
  if (parts.includes(node.type)) return true;
  refused(node.type);

  return false;
}
