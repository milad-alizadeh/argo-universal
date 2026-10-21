import type {
  ScaffoldGeometry,
  ScaffoldGeometryInput,
} from './scaffold-geometry';

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
    inspectorHandleLeft: frame.stage.offset,
    detailRight: frame.stage.offset,
    transitionKey: `${input.sidebarShown}:${input.inspectorState}:${frame.listFolded}:${frame.workbenchState}`,
  };
}

type FramedWidths = Pick<
  ScaffoldGeometry,
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
    visibleListWidth: Math.max(
      input.measures.listWidth,
      input.preferredListWidth,
    ),
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
