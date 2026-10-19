import type { PartVersions } from './kit';
import { isRootOnly, supportsWireNode } from './prepare-tree';
import type { WireNode } from './wire';

export function replacementTreeReason(
  node: WireNode,
  parts: PartVersions,
): string | null {
  return (
    replacementNodeReason(node, parts) ?? replacementChildReason(node, parts)
  );
}

function replacementNodeReason(
  node: WireNode,
  parts: PartVersions,
): string | null {
  if (node.type === '#render-error') return drawingErrorReason(node);

  if (!parts[node.type]) return `App did not report ${node.type}`;

  return invalidReplacementReason(node, parts);
}

function invalidReplacementReason(
  node: WireNode,
  parts: PartVersions,
): string | null {
  if (isRootOnly(node)) return `${node.type} cannot replace a core component`;

  return supportsWireNode(node, parts)
    ? null
    : `invalid ${node.type} props or children`;
}

function replacementChildReason(
  node: WireNode,
  parts: PartVersions,
): string | null {
  const children = [...node.children, ...Object.values(node.slots).flat()];

  return (
    children
      .map((child) => replacementTreeReason(child, parts))
      .find(Boolean) ?? null
  );
}

const drawingErrorReason = (node: WireNode): string =>
  typeof node.props.reason === 'string'
    ? node.props.reason
    : 'tree threw while drawing';
