import { frameGeometry } from './frame-geometry';
import type { FrameGeometry } from './frame-geometry-types';
import { framedGeometry } from './framed-geometry';

// The Inspector: closed, open beside the page, or expanded over it.
export type InspectorState = 'closed' | 'open' | 'expanded';

export const detailMinimum = 360;

export const listMaximum = 460;

// The expanded Inspector's resize handle sits this far right when the sidebar shows.
const expandedInspectorHandleShift = 4;

// With the Inspector closed, its handle keeps its whole grip inside the window's flush right edge.
const closedInspectorHandleInset = 4;

export interface ScaffoldMeasures {
  listWidth: number;
  inspectorWidth: number;
  railWidth: number;
  inset: number;
  // The shared top bar across the rail and the list, where the window controls sit.
  barHeight: number;
  topBandHeight: number;
  workbenchWidth: number;
  paneGap: number;
  composerWidth: number;
  contentGutter: number;
  contentMaximum: number;
}

export interface ScaffoldGeometryInput {
  framed?: boolean;
  workbenchAvailable?: boolean;
  workbenchShown?: boolean;
  measures: ScaffoldMeasures;
  width: number;
  preferredListWidth: number;
  preferredInspectorWidth: number;
  sidebarShown: boolean;
  inspectorState: InspectorState;
}

interface ListGeometry {
  usableWidth: number;
  listLimit: number;
  visibleListWidth: number;
  shownListWidth: number;
  availableWidth: number;
}

interface InspectorGeometry {
  inspectorOpen: boolean;
  inspectorExpanded: boolean;
  inspectorTargetWidth: number;
  detailWidth: number;
}

export interface ScaffoldGeometry extends ListGeometry, InspectorGeometry {
  frame: FrameGeometry;
  listHandleLeft: number;
  inspectorHandleLeft: number;
  detailRight: number;
  transitionKey: string;
}

// The glass zone keeps the rail and its inset on both sides; the list, detail and Inspector share the rest.
function usableWidth({ measures, width }: ScaffoldGeometryInput): number {
  return Math.max(0, width - measures.railWidth - measures.inset * 2);
}

function listLimit(usable: number): number {
  return Math.max(0, usable - Math.min(detailMinimum, usable / 2));
}

function listGeometry(input: ScaffoldGeometryInput): ListGeometry {
  const usable = usableWidth(input);
  const limit = listLimit(usable);
  const visibleListWidth = Math.min(input.preferredListWidth, limit);
  const shownListWidth = input.sidebarShown ? visibleListWidth : 0;

  return {
    usableWidth: usable,
    listLimit: limit,
    visibleListWidth,
    shownListWidth,
    availableWidth: Math.max(0, usable - shownListWidth),
  };
}

function isInspectorExpanded(
  input: ScaffoldGeometryInput,
  availableWidth: number,
): boolean {
  const { inspectorState, measures } = input;

  return (
    inspectorState !== 'closed' &&
    (inspectorState === 'expanded' ||
      availableWidth < measures.inspectorWidth + detailMinimum)
  );
}

function visibleInspectorWidth(
  input: ScaffoldGeometryInput,
  availableWidth: number,
): number {
  return Math.min(
    input.preferredInspectorWidth,
    Math.max(input.measures.inspectorWidth, availableWidth - detailMinimum),
  );
}

function inspectorTargetWidth(
  input: ScaffoldGeometryInput,
  availableWidth: number,
): number {
  if (input.inspectorState === 'closed') return 0;

  if (isInspectorExpanded(input, availableWidth)) return availableWidth;

  return visibleInspectorWidth(input, availableWidth);
}

function inspectorGeometry(
  input: ScaffoldGeometryInput,
  availableWidth: number,
): InspectorGeometry {
  const targetWidth = inspectorTargetWidth(input, availableWidth);

  return {
    inspectorOpen: input.inspectorState !== 'closed',
    inspectorExpanded: isInspectorExpanded(input, availableWidth),
    inspectorTargetWidth: targetWidth,
    detailWidth: Math.max(0, availableWidth - targetWidth),
  };
}

function inspectorHandleShift(
  sidebarShown: boolean,
  inspectorExpanded: boolean,
): number {
  return inspectorExpanded && sidebarShown ? expandedInspectorHandleShift : 0;
}

function inspectorHandleLeft(
  input: ScaffoldGeometryInput,
  { inspectorTargetWidth: targetWidth, inspectorExpanded }: InspectorGeometry,
): number {
  return (
    input.width -
    Math.max(targetWidth, closedInspectorHandleInset) +
    inspectorHandleShift(input.sidebarShown, inspectorExpanded)
  );
}

function legacyGeometry(input: ScaffoldGeometryInput): ScaffoldGeometry {
  const list = listGeometry(input);
  const inspector = inspectorGeometry(input, list.availableWidth);

  return {
    frame: frameGeometry(input),
    ...list,
    ...inspector,
    listHandleLeft:
      input.measures.inset + input.measures.railWidth + list.shownListWidth,
    inspectorHandleLeft: inspectorHandleLeft(input, inspector),
    detailRight: list.usableWidth - inspector.inspectorTargetWidth,
    transitionKey: `${input.sidebarShown}:${input.inspectorState}:${inspector.inspectorExpanded}`,
  };
}

export function scaffoldGeometry(
  input: ScaffoldGeometryInput,
): ScaffoldGeometry {
  const geometry = legacyGeometry(input);

  return input.framed ? framedGeometry(input, geometry) : geometry;
}
