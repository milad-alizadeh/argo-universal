import type { WireNode } from '@repo/contracts/plugins/wire';
import { parseSvg } from './svg-parser';
import { sanitizeSvg } from './svg-sanitizer';

export interface RefusedSvg {
  node: string;
  reason: string;
}

export interface SanitizedTree {
  root: WireNode;
  refused: RefusedSvg[];
  containsSvg: boolean;
}

export function sanitizeTree(root: WireNode): SanitizedTree {
  const refused: RefusedSvg[] = [];
  let containsSvg = false;
  const next = visit(root, [], refused, () => (containsSvg = true));

  return { root: next ?? emptyTree(), refused, containsSvg };
}

function visit(
  node: WireNode,
  path: string[],
  refused: RefusedSvg[],
  onSvg: () => void,
): WireNode | null {
  const nodePath = [...path, `${node.type}#${node.key}`];
  let props = node.props;

  if (node.type === 'Svg') {
    onSvg();
    const xml = props.xml;
    const result =
      typeof xml === 'string'
        ? sanitizeSvg(xml, parseSvg)
        : { ok: false as const, reason: 'xml must be a string' };

    if (!result.ok) {
      refused.push({ node: nodePath.join('/'), reason: result.reason });
      return null;
    }

    props = { ...props, xml: result.xml };
  }

  const children = node.children.flatMap((child) => {
    const sanitized = visit(child, nodePath, refused, onSvg);
    return sanitized ? [sanitized] : [];
  });
  const slots = Object.fromEntries(
    Object.entries(node.slots).map(([name, nodes]) => [
      name,
      nodes.flatMap((child) => {
        const sanitized = visit(child, nodePath, refused, onSvg);
        return sanitized ? [sanitized] : [];
      }),
    ]),
  );

  return { ...node, props, children, slots };
}

function emptyTree(): WireNode {
  return { type: 'Column', key: '0', props: {}, children: [], slots: {} };
}
