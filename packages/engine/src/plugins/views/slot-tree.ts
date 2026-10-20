import { wireParts } from '@repo/contracts/plugins/kit';
import { sessionRowSlotId, type WireNode } from '@repo/contracts/plugins/wire';

export function prepareSlotTree(
  slotId: string | undefined,
  root: WireNode,
  refused: (type: string) => void,
): WireNode {
  if (slotId !== sessionRowSlotId) return root;

  return {
    type: 'Stack',
    key: root.key,
    props: { direction: 'row' },
    children: metaNodes(root).filter((node) => allowedPart(node, refused)),
    slots: {},
  };
}

function metaNodes(root: WireNode): WireNode[] {
  return root.type === 'Stack' ? root.children : [root];
}

function allowedPart(node: WireNode, refused: (type: string) => void): boolean {
  if (wireParts.ListItem.slots.meta.some((part) => part === node.type))
    return true;
  refused(node.type);

  return false;
}
