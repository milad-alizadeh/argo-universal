import { kitComponent } from './kit';
import { isRootOnly, supportsWireNode } from './prepare-tree';
import type { WireNode } from './wire';

// A Replaceable Slot tree is drawn whole or not at all, checked against the current schema set.
export function replacementTreeReason(node: WireNode): string | undefined {
  return replacementNodeReason(node) ?? replacementChildReason(node);
}

function replacementNodeReason(node: WireNode): string | undefined {
  if (node.type === '#render-error') return drawingErrorReason(node);

  if (!kitComponent(node.type)) return `${node.type} is not a kit component`;

  return kitNodeReason(node);
}

function kitNodeReason(node: WireNode): string | undefined {
  if (isRootOnly(node)) return `${node.type} cannot replace a core component`;

  return supportsWireNode(node)
    ? undefined
    : `invalid ${node.type} props or children`;
}

function replacementChildReason(node: WireNode): string | undefined {
  const children = [...node.children, ...Object.values(node.slots).flat()];

  return children.map(replacementTreeReason).find(Boolean);
}

const drawingErrorReason = (node: WireNode): string =>
  typeof node.props.reason === 'string'
    ? node.props.reason
    : 'tree threw while drawing';
