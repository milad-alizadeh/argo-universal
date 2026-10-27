import type { WireNode } from '@repo/contracts/plugins/wire';
import { actionUrlReason } from './action-urls';
import { canvasReason } from './canvas-validation';
import { visualPropsReason, visualSchemas } from './props';

// Kit components the Server refuses outright, with the reason it gives.
const refusedComponents = new Map([
  ['CodeMap', 'unsupported CodeMap; use Canvas (ADR-0028)'],
]);

// Every visual kit component a Plugin can draw or be refused for; Canvas drawings are named `Canvas.*`.
export const visualComponents = [
  ...[...visualSchemas.keys()].filter((type) => !drawsInCanvas(type)),
  ...refusedComponents.keys(),
];

// A node outside any Canvas; a drawing inside one is checked by canvasReason or drawingReason.
export function visualReason(
  node: WireNode,
  partial = false,
): string | undefined {
  return actionUrlReason(node.props) ?? componentReason(node, partial);
}

function placementReason(type: string): string | undefined {
  const refused = refusedComponents.get(type);

  if (refused) return refused;

  return drawsInCanvas(type)
    ? 'shapes are only valid inside Canvas'
    : undefined;
}

function drawsInCanvas(type: string): boolean {
  return type.startsWith('Canvas.');
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

function componentReason(node: WireNode, partial: boolean): string | undefined {
  return placementReason(node.type) ?? dataReason(node, partial);
}
