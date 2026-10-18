import type { WireNode } from '@repo/contracts/plugins/wire';
import { canvasReason } from './canvas-validation';
import { visualPropsReason } from './visual-props';

export function visualReason(
  node: WireNode,
  partial = false,
): string | undefined {
  return placementReason(node.type) ?? dataReason(node, partial);
}

function placementReason(type: string): string | undefined {
  if (type === 'CodeMap') return 'unsupported CodeMap; use Canvas (ADR-0028)';

  return type.startsWith('Canvas.')
    ? 'shapes are only valid inside Canvas'
    : undefined;
}

function dataReason(node: WireNode, partial: boolean): string | undefined {
  return (
    visualPropsReason(node.type, node.props, partial) ??
    sceneReason(node, partial)
  );
}

function sceneReason(node: WireNode, partial: boolean): string | undefined {
  return node.type === 'Canvas' ? canvasReason(node, partial) : undefined;
}
