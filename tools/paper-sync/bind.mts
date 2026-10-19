import { initialLabels, reconcileLabel } from './labels.mts';
import { getRoot, layoutKeys, type Binding, type Snapshot } from './model.mts';
import { mapNodes } from './node-mapping.mts';

function copyLayout(copy: Snapshot): Binding['layout'] {
  return Object.fromEntries(
    Object.entries(getRoot(copy).styles).filter(([key]) => layoutKeys.has(key)),
  );
}

function initialBinding(master: Snapshot, copy: Snapshot): Binding {
  return {
    fileId: copy.fileId,
    nodeId: copy.rootId,
    name: getRoot(copy).name,
    nodes: { [master.rootId]: copy.rootId },
    ...initialLabels(master, copy),
    layout: copyLayout(copy),
  };
}

function rejectExtraIcon(copy: Snapshot, linked: Binding): void {
  const extraIcon = copy.nodes.find(
    (node) =>
      node.component === 'SVG' &&
      !Object.values(linked.nodes).includes(node.id),
  );

  if (extraIcon)
    throw new Error(
      `${getRoot(copy).name}: unmatched icon ${extraIcon.name}; name it like the master's icon slot or choose a master with that icon`,
    );
}

export function enroll(master: Snapshot, copy: Snapshot): Binding {
  const linked = reconcileBinding(master, copy, initialBinding(master, copy));
  rejectExtraIcon(copy, linked);

  return linked;
}

function retainedNodes(
  master: Snapshot,
  copy: Snapshot,
  nodes: Binding['nodes'],
): Binding['nodes'] {
  const ids = new Set(copy.nodes.map((node) => node.id));

  return Object.fromEntries(
    Object.entries(nodes).filter(
      ([source, id]) =>
        ids.has(id) && master.nodes.some((node) => node.id === source),
    ),
  );
}

export function reconcileBinding(
  master: Snapshot,
  copy: Snapshot,
  prior: Binding,
): Binding {
  const binding = structuredClone(prior);
  binding.layout = copyLayout(copy);
  binding.nodes = retainedNodes(master, copy, binding.nodes);
  binding.nodes[master.rootId] = copy.rootId;
  reconcileLabel(master, copy, binding);
  mapNodes(master, copy, binding.nodes);

  return binding;
}
