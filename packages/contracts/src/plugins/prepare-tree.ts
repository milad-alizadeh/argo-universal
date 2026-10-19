import { z } from 'zod';
import {
  legacyPartVersions,
  wirePart,
  type PartVersions,
  type WirePartDefinition,
} from './kit';
import {
  acceptsChildren,
  acceptsSlots,
  type ChildRule,
  type SlotRules,
} from './prepare-slots';
import { refusedBelowRoot, rootSlotParts } from './root-only';
import { WireJson, type WireNode } from './wire';
import type { LoweredPart } from './wire-part-definition';

const jsonProps = z.record(z.string(), WireJson);

const hasSlots = (node: WireNode): boolean =>
  Object.keys(node.slots).length > 0;

const hasContent = (node: WireNode): boolean =>
  node.children.length > 0 || hasSlots(node);

export { isRootOnly, refusedBelowRoot, rootSlotParts } from './root-only';

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

function parsedNode(node: WireNode, schema: z.ZodType): WireNode | null {
  const parsed = schema.safeParse(node.props);

  return parsed.success
    ? { ...node, props: jsonProps.parse(parsed.data) }
    : null;
}

const styled = (node: WireNode): boolean =>
  'className' in node.props || 'style' in node.props;

interface ContentRules {
  children: ChildRule;
  slots: SlotRules;
}

const validContent = (node: WireNode, rules: ContentRules): boolean =>
  acceptsSlots(node, rules.slots) &&
  acceptsChildren(node.children, rules.children);

const allowedStructure = (node: WireNode, rules: ContentRules): boolean =>
  !styled(node) && validContent(node, rules);

function currentNode(node: WireNode): WireNode | null {
  const part = wirePart(node.type);

  if (!part) return null;

  if (!allowedStructure(node, part)) return null;

  return parsedNode(node, part.props);
}

function versionSchema(
  versions: readonly z.ZodType[],
  version: number | undefined,
): z.ZodType | undefined {
  if (!version) return undefined;

  return versions[Math.min(version, versions.length) - 1];
}

function lowered(
  node: WireNode,
  part: WirePartDefinition,
  parts: PartVersions,
): WireNode | null {
  const older = part.lower?.(node.props);

  return older ? olderNode(node, older, parts) : null;
}

function olderNode(
  node: WireNode,
  older: LoweredPart,
  parts: PartVersions,
): WireNode | null {
  const schema = versionSchema(older.versions, parts[older.type]);
  const { type, props } = older;

  return schema ? parsedNode({ ...node, type, props }, schema) : null;
}

function adapted(node: WireNode, parts: PartVersions): WireNode | null {
  const part = wirePart(node.type);

  if (!part) return null;
  const schema = versionSchema(part.versions, parts[node.type]);

  return schema ? parsedNode(node, schema) : lowered(node, part, parts);
}

function prepareNodes(
  nodes: WireNode[],
  parts: PartVersions,
  roots: readonly string[] = [],
): WireNode[] {
  return nodes.flatMap((child) => {
    const next = refusedBelowRoot(child, roots)
      ? unsupported(child, parts)
      : prepare(child, parts);

    return next ? [next] : [];
  });
}

function slotsOf(node: WireNode, parts: PartVersions): WireNode['slots'] {
  return Object.fromEntries(
    Object.entries(node.slots).flatMap(([name, children]) => {
      const prepared = prepareNodes(children, parts, rootSlotParts(node, name));

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

export function supportsWireNode(node: WireNode, parts: PartVersions): boolean {
  return Boolean(currentNode(node) && adapted(node, parts));
}
