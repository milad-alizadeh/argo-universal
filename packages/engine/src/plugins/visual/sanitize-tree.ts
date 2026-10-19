import type { WireNode } from '@repo/contracts/plugins/wire';
import { parseSvg } from '../svg/parser';
import { sanitizeSvg } from '../svg/sanitizer';
import { visualReason } from './validation';

export interface RefusedSvg {
  node: string;
  reason: string;
}

export interface SanitizedTree {
  root: WireNode;
  refused: RefusedSvg[];
  containsSvg: boolean;
}

interface VisitState {
  refused: RefusedSvg[];
  containsSvg: boolean;
}

export function sanitizeTree(root: WireNode): SanitizedTree {
  const state: VisitState = { refused: [], containsSvg: false };
  const next = visit(root, [], state);

  return { root: next ?? emptyTree(), ...state };
}

function visit(
  node: WireNode,
  path: string[],
  state: VisitState,
): WireNode | null {
  const sanitized = sanitizeNode(node, path, state);

  if (!sanitized) return null;

  if (sanitized.type === 'Canvas') return sanitized;

  return addSanitizedChildren(sanitized, path, state);
}

function addSanitizedChildren(
  node: WireNode,
  path: string[],
  state: VisitState,
): WireNode {
  const nextPath = nodePath(node, path);

  return {
    ...node,
    children: sanitizeChildren(node.children, nextPath, state),
    slots: sanitizeSlots(node.slots, nextPath, state),
  };
}

function sanitizeNode(
  node: WireNode,
  path: string[],
  state: VisitState,
): WireNode | null {
  if (node.type !== 'Svg') return sanitizeVisualNode(node, path, state);
  state.containsSvg = true;

  return sanitizeSvgNode(node, path, state);
}

function sanitizeVisualNode(
  node: WireNode,
  path: string[],
  state: VisitState,
): WireNode | null {
  const reason = visualReason(node);

  return reason ? recordRefusal({ node, path, state, reason }) : node;
}

function sanitizeSvgNode(
  node: WireNode,
  path: string[],
  state: VisitState,
): WireNode | null {
  const xml = node.props.xml;

  if (typeof xml !== 'string') return refuseInvalidMarkup(node, path, state);

  const result = sanitizeSvg(xml, parseSvg);

  if (!result.ok)
    return recordRefusal({ node, path, state, reason: result.reason });

  return sanitizeVisualNode(withXml(node, result.xml), path, state);
}

function refuseInvalidMarkup(
  node: WireNode,
  path: string[],
  state: VisitState,
): null {
  return recordRefusal({ node, path, state, reason: 'xml must be a string' });
}

interface Refusal {
  node: WireNode;
  path: string[];
  state: VisitState;
  reason: string;
}

function recordRefusal({ node, path, state, reason }: Refusal): null {
  state.refused.push({ node: nodePath(node, path).join('/'), reason });

  return null;
}

function sanitizeChildren(
  nodes: WireNode[],
  path: string[],
  state: VisitState,
): WireNode[] {
  return nodes.flatMap((node) => {
    const child = visit(node, path, state);

    return child ? [child] : [];
  });
}

function sanitizeSlots(
  slots: WireNode['slots'],
  path: string[],
  state: VisitState,
): WireNode['slots'] {
  return Object.fromEntries(
    Object.entries(slots).map(([name, nodes]) => [
      name,
      sanitizeChildren(nodes, path, state),
    ]),
  );
}

function nodePath(node: WireNode, path: string[]): string[] {
  return [...path, `${node.type}#${node.key}`];
}

function emptyTree(): WireNode {
  const props = { direction: 'column' };

  return { type: 'Stack', key: '0', props, children: [], slots: {} };
}

function withXml(node: WireNode, xml: string): WireNode {
  return { ...node, props: { ...node.props, xml } };
}
