import {
  getRoot,
  required,
  type Binding,
  type Snapshot,
  type DesignNode,
} from './model.mts';

type Labels = Pick<Binding, 'textOverrides' | 'lastText'>;

export function textSlots(snapshot: Snapshot): Map<string, DesignNode> {
  const slots = new Map<string, DesignNode>();

  for (const node of snapshot.nodes.filter(
    (item) => item.component === 'Text',
  )) {
    if (slots.has(node.name))
      throw new Error(
        `${getRoot(snapshot).name}: ambiguous text slot "${node.name}"`,
      );
    slots.set(node.name, node);
  }

  return slots;
}

function initialSlot(
  source: Map<string, DesignNode>,
  node: DesignNode,
  result: Labels,
): void {
  const original = source.get(node.name);

  if (!original)
    throw new Error(
      `Unmatched text slot "${node.name}"; name it like its master`,
    );
  const text = textOf(node);
  result.lastText[node.name] = text;

  if (text !== original.textContent) result.textOverrides[node.name] = text;
}

export function initialLabels(master: Snapshot, copy: Snapshot): Labels {
  const source = textSlots(master);
  const result: Labels = { textOverrides: {}, lastText: {} };

  for (const node of textSlots(copy).values())
    initialSlot(source, node, result);

  return result;
}

function preserveSlot(
  binding: Binding,
  pair: { source: DesignNode; copy: DesignNode },
): void {
  const name = pair.source.name;
  binding.nodes[pair.source.id] = pair.copy.id;

  if (pair.copy.textContent !== binding.lastText[name])
    binding.textOverrides[name] = pair.copy.textContent ?? '';
}

function assertSlot(source: Map<string, DesignNode>, name: string): DesignNode {
  if (!source.has(name))
    throw new Error(`Removing slot "${name}" would discard text`);

  return required(source.get(name));
}

export function reconcileLabel(
  master: Snapshot,
  copy: Snapshot,
  binding: Binding,
): void {
  const source = textSlots(master);

  for (const node of textSlots(copy).values())
    preserveSlot(binding, {
      source: assertSlot(source, node.name),
      copy: node,
    });

  for (const name of Object.keys(binding.textOverrides))
    assertSlot(source, name);
}

function textOf(node: DesignNode): string {
  return node.textContent ?? '';
}
