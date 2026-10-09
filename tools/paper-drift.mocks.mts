import type { Registry } from './paper-drift/registry.mts';
import type { Layer, Snapshot, Styles } from './paper-drift/snapshot-model.mts';

// A small Paper file described as nested layers, turned into a snapshot.
export interface LayerMock {
  id: string;
  name: string;
  type?: string;
  text?: string;
  styles?: Styles;
  children?: LayerMock[];
}

interface Place {
  parent: string | null;
  artboard: string;
}

function childrenOf(mock: LayerMock): LayerMock[] {
  return mock.children ?? [];
}

function typeOf(mock: LayerMock): string {
  return mock.type ?? 'Frame';
}

function textOf(mock: LayerMock): { text?: string } {
  return mock.text === undefined ? {} : { text: mock.text };
}

function layerOf(mock: LayerMock, place: Place): Layer {
  const children = childrenOf(mock).map((child): string => child.id);
  const { id, name } = mock;
  return {
    id,
    type: typeOf(mock),
    name,
    hidden: false,
    ...textOf(mock),
    ...place,
    children,
  };
}

function addAll(snapshot: Snapshot, mock: LayerMock, place: Place): void {
  snapshot.layers[mock.id] = layerOf(mock, place);
  snapshot.styles[mock.id] = mock.styles ?? {};
  for (const child of childrenOf(mock))
    addAll(snapshot, child, { parent: mock.id, artboard: place.artboard });
}

export function snapshotOf(
  artboards: LayerMock[],
  tokens: Record<string, string> = {},
): Snapshot {
  const snapshot: Snapshot = {
    fileId: 'file',
    takenAt: '2026-10-09T00:00:00.000Z',
    artboards: artboards.map((board) => ({
      id: board.id,
      name: board.name,
      page: 'Page',
      kind: board.name.includes('Components') ? 'components' : 'screens',
    })),
    layers: {},
    styles: {},
    tokens,
  };
  for (const board of artboards)
    addAll(snapshot, board, { parent: null, artboard: board.id });
  return snapshot;
}

export const chipStyles: Styles = {
  display: 'flex',
  gap: '8px',
  backgroundColor: '#111111',
};
export const labelStyles: Styles = { fontSize: '14px', color: '#FFFFFF' };

// A Chip master with a nested Dot master, presented on a component card.
export function chipMaster(): LayerMock {
  return {
    id: 'chip',
    name: 'Chip',
    styles: chipStyles,
    children: [
      { id: 'dot', name: 'Dot / On', styles: { backgroundColor: '#22C55E' } },
      {
        id: 'label',
        name: 'Label',
        type: 'Text',
        text: 'Label',
        styles: labelStyles,
      },
    ],
  };
}

export function chipCopy(
  id: string,
  overrides: { root?: Styles; label?: Styles; dot?: string } = {},
): LayerMock {
  return {
    id,
    name: 'Chip',
    styles: { ...chipStyles, ...overrides.root },
    children: [
      {
        id: `${id}-dot`,
        name: overrides.dot ?? 'Dot / On',
        styles: { backgroundColor: '#22C55E' },
      },
      {
        id: `${id}-label`,
        name: 'Label',
        type: 'Text',
        text: 'Copy',
        styles: { ...labelStyles, ...overrides.label },
      },
    ],
  };
}

export function componentBoard(...presented: LayerMock[]): LayerMock {
  return {
    id: 'board',
    name: 'Components / Test',
    children: [{ id: 'cell', name: 'Cell / Desktop', children: presented }],
  };
}

export function screen(...layers: LayerMock[]): LayerMock {
  return { id: 'screen', name: 'Screen', children: layers };
}

export const chipRegistry: Registry = {
  fileId: 'file',
  masters: [
    { name: 'Chip', id: 'chip' },
    { name: 'Dot / Off', id: 'dot-off' },
    {
      name: 'Dot / On',
      id: 'dot-on',
      variantOf: 'Dot / Off',
      props: { '': { backgroundColor: '#22C55E' } },
    },
  ],
};
