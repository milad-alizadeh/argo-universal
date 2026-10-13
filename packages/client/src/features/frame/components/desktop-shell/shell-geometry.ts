import type { InspectorState } from './desktop-shell-props';

export const detailMinimum = 360;

export const listMaximum = 460;

// The expanded Inspector's resize handle sits this far right when the sidebar shows.
const expandedInspectorHandleShift = 4;

// With the Inspector closed, its handle keeps its whole grip inside the window's flush right edge.
const closedInspectorHandleInset = 4;

export interface ShellMeasures {
  listWidth: number;
  inspectorWidth: number;
  railWidth: number;
  inset: number;
}

export interface ShellGeometryInput {
  measures: ShellMeasures;
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

export interface ShellGeometry extends ListGeometry, InspectorGeometry {
  listHandleLeft: number;
  inspectorHandleLeft: number;
  detailRight: number;
  transitionKey: string;
}

// The glass zone keeps the rail and its inset on both sides; the list, detail and Inspector share the rest.
function usableWidth({ measures, width }: ShellGeometryInput): number {
  return Math.max(0, width - measures.railWidth - measures.inset * 2);
}

function listLimit(usable: number): number {
  return Math.max(0, usable - Math.min(detailMinimum, usable / 2));
}

function listGeometry(input: ShellGeometryInput): ListGeometry {
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
  input: ShellGeometryInput,
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
  input: ShellGeometryInput,
  availableWidth: number,
): number {
  return Math.min(
    input.preferredInspectorWidth,
    Math.max(input.measures.inspectorWidth, availableWidth - detailMinimum),
  );
}

function inspectorTargetWidth(
  input: ShellGeometryInput,
  availableWidth: number,
): number {
  if (input.inspectorState === 'closed') return 0;

  if (isInspectorExpanded(input, availableWidth)) return availableWidth;

  return visibleInspectorWidth(input, availableWidth);
}

function inspectorGeometry(
  input: ShellGeometryInput,
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
  input: ShellGeometryInput,
  { inspectorTargetWidth: targetWidth, inspectorExpanded }: InspectorGeometry,
): number {
  return (
    input.width -
    Math.max(targetWidth, closedInspectorHandleInset) +
    inspectorHandleShift(input.sidebarShown, inspectorExpanded)
  );
}

export function shellGeometry(input: ShellGeometryInput): ShellGeometry {
  const list = listGeometry(input);
  const inspector = inspectorGeometry(input, list.availableWidth);

  return {
    ...list,
    ...inspector,
    listHandleLeft:
      input.measures.inset + input.measures.railWidth + list.shownListWidth,
    inspectorHandleLeft: inspectorHandleLeft(input, inspector),
    detailRight: list.usableWidth - inspector.inspectorTargetWidth,
    transitionKey: `${input.sidebarShown}:${input.inspectorState}:${inspector.inspectorExpanded}`,
  };
}
