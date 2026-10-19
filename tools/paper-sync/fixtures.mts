import type { DesignNode, Snapshot } from './model.mts';

type NodeOptions = { children?: string[]; text?: string };

function content(
  id: string,
  text: string | undefined,
): Pick<DesignNode, 'name' | 'component' | 'textContent'> {
  if (text === undefined)
    return { name: id, component: 'Frame', textContent: null };

  return { name: 'Label', component: 'Text', textContent: text };
}

export function node(
  id: string,
  parentId: string | null,
  options: NodeOptions = {},
): DesignNode {
  const flags = { isVisible: true, isLocked: false, styles: {}, svg: null };

  return {
    id,
    parentId,
    childIds: options.children ?? [],
    ...content(id, options.text),
    ...flags,
  };
}

type Pair = { master: Snapshot; copy: Snapshot };

export function pair(label = 'Publish'): Pair {
  const master = fixtureSnapshot(
    'source',
    { root: 'button', text: 'label' },
    'Save',
  );

  const copy = fixtureSnapshot(
    'destination',
    { root: 'copy', text: 'text' },
    label,
  );

  return { master, copy };
}

function fixtureSnapshot(
  fileId: string,
  ids: { root: string; text: string },
  label: string,
): Snapshot {
  const root = node(ids.root, null, { children: [ids.text] });
  const text = node(ids.text, ids.root, { text: label });

  return { fileId, rootId: ids.root, nodes: [root, text] };
}
