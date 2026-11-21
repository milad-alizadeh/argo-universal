import type { WireNode } from '@repo/contracts/plugins/wire';
import type { DraftNaming } from './draft-drawing';

// A Draft page as the Agent writes it: a header and a list, each its own region (ADR-0057).
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
  props: { title, subtitle },
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
  props: { appearance: 'cards' },
  children,
  slots: {},
});

const placeholders = (): WireNode[] =>
  ['one', 'two', 'three'].map((key) => row(key, 'Loading', 'Loading'));

const loadedRows = (): WireNode[] => [
  row('ARGO-412', 'Workbench card loses its tab after a reload', 'In progress'),
  row('ARGO-409', 'Pairing code expires before the phone scans it', 'To do'),
  row('ARGO-401', 'Composer drops a draft on Cmd+Enter', 'In review'),
];

const headerSkeleton = (): WireNode =>
  stack('header', [text('placeholder', 'Loading', 'heading')]);

const headerLanded = (): WireNode =>
  stack('header', [
    text('title', 'Issues', 'heading'),
    text('count', 'ARGO · 24 open'),
  ]);

// The page: a keyed skeleton of both regions.
export const skeletonPage = (): WireNode =>
  stack('page', [headerSkeleton(), list(placeholders())]);

// The page once the Agent has written the header.
export const headerLandedPage = (): WireNode =>
  stack('page', [headerLanded(), list(placeholders())]);

// The page once the Agent has written the list too.
export const listLandedPage = (): WireNode =>
  stack('page', [headerLanded(), list(loadedRows())]);

export type DraftStep = { root: WireNode; naming: DraftNaming | null };

const header: DraftNaming = { region: 'header', serial: 1 };

const listing: DraftNaming = { region: 'list', serial: 2 };

// What the App is given, in order, while the Agent draws the page: each root is a new answer, as a redraw is.
export const draftSteps: DraftStep[] = [
  { root: skeletonPage(), naming: null },
  { root: skeletonPage(), naming: header },
  { root: skeletonPage(), naming: header },
  { root: skeletonPage(), naming: listing },
  { root: headerLandedPage(), naming: listing },
  { root: listLandedPage(), naming: listing },
];

// The steps up to which each story draws.
export const drawnSkeleton = 0;

export const drawingHeader = 2;

export const drawingList = 4;

export const landed = 5;
