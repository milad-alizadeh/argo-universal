import type { WireNode } from '@repo/contracts/plugins/wire';
import type { DraftNaming } from './draft-drawing';

const text = (key: string, children: string, role?: string): WireNode => ({
  type: 'Text',
  key,
  props: role ? { children, role } : { children },
  children: [],
  slots: {},
});

const row = (key: string, title: string, subtitle: string): WireNode => ({
  type: 'ListItem',
  key,
  props: { title, subtitle, multiline: true },
  children: [],
  slots: {},
});

const stack = (key: string, children: WireNode[]): WireNode => ({
  type: 'Stack',
  key,
  props: { direction: 'column', gap: 4 },
  children,
  slots: {},
});

const list = (children: WireNode[]): WireNode => ({
  type: 'List',
  key: 'list',
  props: { appearance: 'grouped' },
  children: [
    { type: 'List.Section', key: 'rows', props: {}, children, slots: {} },
  ],
  slots: {},
});

const skeletonRect = (key: string, bounds: WireNode['props']): WireNode => ({
  type: 'Canvas.Rect',
  key,
  props: { rx: 8, tone: 'muted', intensity: 0.22, fill: true, ...bounds },
  children: [],
  slots: {},
});

const placeholder = (
  key: string,
  viewport: { label: string; height: number },
  children: WireNode[],
): WireNode => ({
  type: 'Canvas',
  key,
  props: { ...viewport, width: 440, camera: 'fixed' },
  children,
  slots: {},
});

const skeletonEdge = (key: string, d: string): WireNode => ({
  type: 'Canvas.Path',
  key,
  props: { d, tone: 'muted', intensity: 0.12, fill: true },
  children: [],
  slots: {},
});

const listSkeleton = (): WireNode =>
  placeholder('list', { label: 'Issue list skeleton', height: 135 }, [
    skeletonEdge('first', 'M16 0 H424 Q440 0 440 16 V44 H0 V16 Q0 0 16 0 Z'),
    skeletonRect('second', {
      x: 0,
      y: 45,
      width: 440,
      height: 44,
      rx: 0,
      intensity: 0.12,
    }),
    skeletonEdge(
      'third',
      'M0 90 H440 V119 Q440 135 424 135 H16 Q0 135 0 119 Z',
    ),
  ]);

const loadedRows = (): WireNode[] => [
  row('ARGO-412', 'Workbench card loses its tab after a reload', 'In progress'),
  row('ARGO-409', 'Pairing code expires before the phone scans it', 'To do'),
  row('ARGO-401', 'Composer drops a draft on Cmd+Enter', 'In review'),
];

const headerSkeleton = (): WireNode =>
  stack('header', [
    placeholder('placeholder', { label: 'Page title skeleton', height: 56 }, [
      skeletonRect('title', { x: 0, y: 8, width: 96, height: 18 }),
      skeletonRect('count', { x: 0, y: 33, width: 72, height: 12 }),
      skeletonRect('filters', {
        x: 300,
        y: 12,
        width: 140,
        height: 28,
        rx: 12,
      }),
    ]),
  ]);

const headerLanded = (): WireNode =>
  stack('header', [
    text('title', 'Issues', 'heading'),
    text('count', 'ARGO · 24 open'),
  ]);

const skeletonPage = (): WireNode =>
  stack('page', [headerSkeleton(), listSkeleton()]);

const headerLandedPage = (): WireNode =>
  stack('page', [headerLanded(), listSkeleton()]);

export const listLandedPage = (): WireNode =>
  stack('page', [headerLanded(), list(loadedRows())]);

export type DraftStep = { root: WireNode; naming?: DraftNaming };

const header: DraftNaming = { region: 'header', serial: 1 };

const listing: DraftNaming = { region: 'list', serial: 2 };

// What the App is given, in order, while the Agent draws the page: each root is a new answer, as a redraw is.
export const draftSteps: DraftStep[] = [
  { root: skeletonPage() },
  { root: skeletonPage(), naming: header },
  { root: skeletonPage(), naming: header },
  { root: skeletonPage(), naming: listing },
  { root: headerLandedPage(), naming: listing },
  { root: listLandedPage(), naming: listing },
];

export const drawnSkeleton = 0;

export const drawingHeader = 2;

export const drawingList = 4;

export const landed = 5;

// The regions the page's manifest declares, so the page wraps them from its first draw.
export const declaredRegions = ['header', 'list'];

export const rowPage = (): WireNode => ({
  type: 'Stack',
  key: 'page',
  props: { direction: 'row', gap: 4 },
  children: [
    text('label', 'Label'),
    {
      type: 'Stack',
      key: 'header',
      props: { direction: 'column' },
      children: [text('fills', 'Fills the rest of the row')],
      slots: {},
    },
  ],
  slots: {},
});

export const rowSteps: DraftStep[] = [
  { root: rowPage() },
  { root: rowPage(), naming: header },
  { root: rowPage(), naming: header },
];
