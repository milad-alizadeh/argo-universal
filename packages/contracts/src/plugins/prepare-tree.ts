import { z } from 'zod';
import { legacyPartVersions, wirePart, type PartVersions } from './kit';
import { WireJson, type WireNode } from './wire';

const jsonProps = z.record(z.string(), WireJson);

const hasSlots = (node: WireNode): boolean =>
  Object.keys(node.slots).length > 0;

const hasContent = (node: WireNode): boolean =>
  node.children.length > 0 || hasSlots(node);

export const isWireContainer = (node: WireNode): boolean =>
  Boolean(wirePart(node.type)?.container) || hasContent(node);

function unsupported(node: WireNode): WireNode | null {
  return isWireContainer(node)
    ? {
        type: 'Text',
        key: node.key,
        props: {
          label: 'Update Argo to see this',
          variant: 'secondary',
          tone: 'muted',
        },
        children: [],
        slots: {},
      }
    : null;
}

function alias(node: WireNode, parts: PartVersions): WireNode {
  const { direction, ...props } = node.props;
  const type = direction === 'row' ? 'Row' : 'Column';

  return parts[type] ? { ...node, type, props } : node;
}

function lower(node: WireNode, parts: PartVersions): WireNode {
  if (node.type !== 'Stack') return node;

  if (parts['Stack']) return node;

  return alias(node, parts);
}

function parsedNode(node: WireNode, schema: z.ZodType): WireNode | null {
  const parsed = schema.safeParse(node.props);

  return parsed.success
    ? { ...node, props: jsonProps.parse(parsed.data) }
    : null;
}

const styled = (node: WireNode): boolean =>
  'className' in node.props || 'style' in node.props;

const allowedContent = (node: WireNode, container: boolean): boolean =>
  container || node.children.length === 0;

const validContent = (node: WireNode, container: boolean): boolean =>
  !hasSlots(node) && allowedContent(node, container);

const allowedStructure = (node: WireNode, container: boolean): boolean =>
  !styled(node) && validContent(node, container);

function currentNode(node: WireNode): WireNode | null {
  const part = wirePart(node.type);

  if (!part) return null;

  if (!allowedStructure(node, part.container)) return null;

  return parsedNode(node, part.props);
}

function versionSchema(
  type: string,
  parts: PartVersions,
): z.ZodType | undefined {
  const part = wirePart(type);
  const version = parts[type];

  if (!part || !version) return undefined;

  return part.versions[Math.min(version, part.versions.length) - 1];
}

function adapted(node: WireNode, parts: PartVersions): WireNode | null {
  const lowered = lower(node, parts);
  const schema = versionSchema(lowered.type, parts);

  return schema ? parsedNode(lowered, schema) : null;
}

function childrenOf(node: WireNode, parts: PartVersions): WireNode[] {
  return node.children.flatMap((child) => {
    const next = prepare(child, parts);

    return next ? [next] : [];
  });
}

function prepare(node: WireNode, parts: PartVersions): WireNode | null {
  const current = currentNode(node);

  if (!current) return unsupported(node);
  const compatible = adapted(current, parts);

  if (!compatible) return unsupported(node);

  return { ...compatible, children: childrenOf(node, parts), slots: {} };
}

// Both validation and version adaptation happen before a tree reaches an App.
export function prepareWireTree(
  root: WireNode,
  parts: PartVersions = legacyPartVersions,
): WireNode {
  return (
    prepare(root, parts) ?? {
      type: '#empty',
      key: root.key,
      props: {},
      children: [],
      slots: {},
    }
  );
}
