import { z } from 'zod';
import { legacyPartVersions, wirePart, type PartVersions } from './kit';
import { acceptsSlots, type SlotRules } from './prepare-slots';
import { WireJson, type WireNode } from './wire';

const jsonProps = z.record(z.string(), WireJson);

const hasSlots = (node: WireNode): boolean =>
  Object.keys(node.slots).length > 0;

const hasContent = (node: WireNode): boolean =>
  node.children.length > 0 || hasSlots(node);

export const isWireContainer = (node: WireNode): boolean =>
  Boolean(wirePart(node.type)?.container) || hasContent(node);

function updateMessage(key: string): WireNode {
  return {
    type: 'Text',
    key,
    props: {
      children: 'Update Argo to see this',
      role: 'secondary',
      tone: 'muted',
    },
    children: [],
    slots: {},
  };
}

function unsupported(node: WireNode, parts: PartVersions): WireNode | null {
  return isWireContainer(node) ? adapted(updateMessage(node.key), parts) : null;
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

interface ContentRules {
  children: boolean;
  slots: SlotRules;
}

const validContent = (node: WireNode, rules: ContentRules): boolean =>
  acceptsSlots(node, rules.slots) && allowedContent(node, rules.children);

const allowedStructure = (node: WireNode, rules: ContentRules): boolean =>
  !styled(node) && validContent(node, rules);

function currentNode(node: WireNode): WireNode | null {
  const part = wirePart(node.type);

  if (!part) return null;

  if (!allowedStructure(node, part)) return null;

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

function prepareNodes(nodes: WireNode[], parts: PartVersions): WireNode[] {
  return nodes.flatMap((child) => {
    const next = prepare(child, parts);

    return next ? [next] : [];
  });
}

function slotsOf(node: WireNode, parts: PartVersions): WireNode['slots'] {
  return Object.fromEntries(
    Object.entries(node.slots).flatMap(([name, children]) => {
      const prepared = prepareNodes(children, parts);

      return prepared.length ? [[name, prepared]] : [];
    }),
  );
}

function prepare(node: WireNode, parts: PartVersions): WireNode | null {
  const current = currentNode(node);

  if (!current) return unsupported(node, parts);
  const compatible = adapted(current, parts);

  if (!compatible) return unsupported(node, parts);

  return {
    ...compatible,
    children: prepareNodes(node.children, parts),
    slots: slotsOf(node, parts),
  };
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
