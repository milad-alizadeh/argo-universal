import { getRoot, required, type DesignNode, type Snapshot } from './model.mts';

const iconName = /^Icon(?: \((?:ios|android|phone)\))?(?: \/ .+)?$/;

export function isIcon(node: DesignNode): boolean {
  return node.component === 'SVG' && iconName.test(node.name);
}

function parentName(snapshot: Snapshot, icon: DesignNode): string {
  return snapshot.nodes.find((node) => node.id === icon.parentId)?.name ?? '';
}

function slotName(snapshot: Snapshot, icon: DesignNode): string {
  return icon.parentId === snapshot.rootId
    ? 'Icon'
    : `${parentName(snapshot, icon)} > Icon`;
}

export function iconGroups(snapshot: Snapshot): Map<string, DesignNode[]> {
  const groups = new Map<string, DesignNode[]>();

  for (const icon of snapshot.nodes.filter(isIcon)) {
    const name = slotName(snapshot, icon);
    groups.set(name, [...(groups.get(name) ?? []), icon]);
  }

  return groups;
}

function onlyIcon(
  snapshot: Snapshot,
  [name, icons]: [string, DesignNode[]],
): DesignNode {
  if (icons.length !== 1)
    throw new Error(`${getRoot(snapshot).name}: ambiguous icon slot "${name}"`);

  return required(icons[0]);
}

export function iconSlots(snapshot: Snapshot): Map<string, DesignNode> {
  return new Map(
    [...iconGroups(snapshot)].map((entry) => [
      entry[0],
      onlyIcon(snapshot, entry),
    ]),
  );
}
