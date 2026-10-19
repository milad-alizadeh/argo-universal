import {
  getRoot,
  layoutKeys,
  type Binding,
  type Snapshot,
  type DesignNode,
} from './model.mts';

export function labelOf(snapshot: Snapshot): DesignNode | undefined {
  const labels = snapshot.nodes.filter((node) => node.component === 'Text');
  if (labels.length > 1)
    throw new Error(
      `${getRoot(snapshot).name}: multiple text slots require an explicit mapping`,
    );
  return labels[0];
}

export function enroll(master: Snapshot, copy: Snapshot): Binding {
  const sourceLabel = labelOf(master);
  const copyLabel = labelOf(copy);
  if (sourceLabel && !copyLabel)
    throw new Error(`${getRoot(copy).name}: no label to preserve`);
  if (!sourceLabel && copyLabel)
    throw new Error(`${getRoot(copy).name}: master has no label slot`);
  const textOverrides: Record<string, string> = {};
  if (copyLabel && sourceLabel?.textContent !== copyLabel.textContent)
    textOverrides.label = copyLabel.textContent ?? '';
  const binding: Binding = {
    fileId: copy.fileId,
    nodeId: copy.rootId,
    name: getRoot(copy).name,
    nodes: { [master.rootId]: copy.rootId },
    textOverrides,
    lastText: copyLabel ? { label: copyLabel.textContent ?? '' } : {},
    layout: Object.fromEntries(
      Object.entries(getRoot(copy).styles).filter(([key]) =>
        layoutKeys.has(key),
      ),
    ),
  };
  const linked = reconcileBinding(master, copy, binding);
  const extraIcon = copy.nodes.find(
    (node) =>
      node.component === 'SVG' &&
      !Object.values(linked.nodes).includes(node.id),
  );
  if (extraIcon)
    throw new Error(
      `${getRoot(copy).name}: unmatched icon ${extraIcon.name}; choose a master with that icon before enrollment`,
    );
  return linked;
}

function mapUniqueNodes(
  master: Snapshot,
  copy: Snapshot,
  nodes: Record<string, string>,
): void {
  for (const source of master.nodes) {
    if (nodes[source.id]) continue;
    const peers = master.nodes.filter(
      (node) =>
        node.name === source.name && node.component === source.component,
    );
    const matches = copy.nodes.filter(
      (node) =>
        node.name === source.name &&
        node.component === source.component &&
        !Object.values(nodes).includes(node.id),
    );
    if (peers.length === 1 && matches.length === 1)
      nodes[source.id] = matches[0]!.id;
  }
}

export function reconcileBinding(
  master: Snapshot,
  copy: Snapshot,
  prior: Binding,
): Binding {
  const binding = structuredClone(prior);
  binding.layout = Object.fromEntries(
    Object.entries(getRoot(copy).styles).filter(([key]) => layoutKeys.has(key)),
  );
  const ids = new Set(copy.nodes.map((node) => node.id));
  binding.nodes = Object.fromEntries(
    Object.entries(binding.nodes).filter(
      ([source, id]) =>
        ids.has(id) && master.nodes.some((node) => node.id === source),
    ),
  );
  binding.nodes[master.rootId] = copy.rootId;
  const sourceLabel = labelOf(master);
  const copyLabel = labelOf(copy);
  if (!sourceLabel && (copyLabel || binding.textOverrides.label !== undefined))
    throw new Error(`${binding.name}: removing the label would discard text`);
  if (sourceLabel && copyLabel) {
    binding.nodes[sourceLabel.id] = copyLabel.id;
    if (copyLabel.textContent !== binding.lastText.label)
      binding.textOverrides.label = copyLabel.textContent ?? '';
  }
  mapUniqueNodes(master, copy, binding.nodes);
  return binding;
}
