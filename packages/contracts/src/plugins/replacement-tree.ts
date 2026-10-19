import { wirePart } from './kit';
import { isRootOnly, supportsWireNode } from './prepare-tree';
import type { WireNode } from './wire';

// A Replaceable Slot tree is drawn whole or not at all, checked against the current schema set.
export function replacementTreeReason(node: WireNode): string | null {
  return replacementNodeReason(node) ?? replacementChildReason(node);
}

function replacementNodeReason(node: WireNode): string | null {
  if (node.type === '#render-error') return drawingErrorReason(node);

  if (!wirePart(node.type)) return `${node.type} is not a kit part`;

  return kitNodeReason(node);
}

function kitNodeReason(node: WireNode): string | null {
  if (isRootOnly(node)) return `${node.type} cannot replace a core component`;

  return supportsWireNode(node)
    ? null
    : `invalid ${node.type} props or children`;
}

function replacementChildReason(node: WireNode): string | null {
  const children = [...node.children, ...Object.values(node.slots).flat()];

  return children.map(replacementTreeReason).find(Boolean) ?? null;
}

const drawingErrorReason = (node: WireNode): string =>
  typeof node.props.reason === 'string'
    ? node.props.reason
    : 'tree threw while drawing';
