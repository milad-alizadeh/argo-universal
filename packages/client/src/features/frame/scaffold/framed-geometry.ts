import type { FrameGeometry } from './frame-geometry-types';
import type {
  ScaffoldGeometry,
  ScaffoldGeometryInput,
} from './scaffold-geometry';
import { sidebarWidth } from './sidebar-intent';

// The frame's pane spans drive the existing animation and divider contracts; phone drill-in keeps its own layout.
export function framedGeometry(
  input: ScaffoldGeometryInput,
  geometry: ScaffoldGeometry,
): ScaffoldGeometry {
  const { frame } = geometry;

  return {
    ...geometry,
    ...framedPaneWidths(input, geometry),
    listHandleLeft: frame.list.offset + frame.list.width,
    inspectorHandleLeft: inspectorHandle(input, frame.stage.offset),
    detailRight: frame.stage.offset,
    transitionKey: `${input.sidebarShown}:${input.inspectorState}:${frame.listFolded}:${frame.workbenchState}`,
  };
}

type FramedWidths = Pick<
  ScaffoldGeometry,
  | 'listLimit'
  | 'shownListWidth'
  | 'visibleListWidth'
  | 'availableWidth'
  | 'inspectorTargetWidth'
  | 'inspectorOpen'
  | 'inspectorExpanded'
  | 'detailWidth'
>;

function framedPaneWidths(
  input: ScaffoldGeometryInput,
  { frame }: ScaffoldGeometry,
): FramedWidths {
  return {
    shownListWidth: frame.list.width,
    listLimit: framedListLimit(input, frame),
    visibleListWidth: sidebarWidth(input),
    availableWidth: Math.max(0, input.width - frame.page.offset),
    ...frameInspector(input, frame.stage.width),
    detailWidth: frame.page.width,
  };
}

function frameInspector(
  input: ScaffoldGeometryInput,
  width: number,
): Pick<
  ScaffoldGeometry,
  'inspectorTargetWidth' | 'inspectorOpen' | 'inspectorExpanded'
> {
  return {
    inspectorTargetWidth: width,
    inspectorOpen: input.inspectorState !== 'closed',
    inspectorExpanded: input.inspectorState === 'expanded',
  };
}

// Expanded panes meet at the sidebar gutter; keep the Stage grip on its own side of that edge.
function inspectorHandle(input: ScaffoldGeometryInput, offset: number): number {
  return (
    offset + (input.inspectorState === 'expanded' ? input.measures.inset : 0)
  );
}

function framedListLimit(
  input: ScaffoldGeometryInput,
  frame: FrameGeometry,
): number {
  if (input.inspectorState === 'expanded') return expandedListLimit(input);

  const floor = input.measures.composerWidth + input.measures.contentGutter * 2;

  return Math.max(0, frame.list.width + frame.page.width - floor);
}

function expandedListLimit({ width, measures }: ScaffoldGeometryInput): number {
  const sidebar = measures.railWidth + measures.inset * 2;

  return Math.max(
    0,
    width - sidebar - measures.inset - measures.inspectorWidth,
  );
}
