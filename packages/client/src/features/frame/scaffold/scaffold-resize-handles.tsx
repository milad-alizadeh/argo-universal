import type * as React from 'react';
import { View } from 'react-native';
import {
  PanelResizeHandle,
  type PanelResizeHandleProps,
} from '../components/panel-resize-handle/panel-resize-handle';
import {
  detailMinimum,
  type InspectorState,
  listMaximum,
} from './scaffold-geometry';
import type {
  ScaffoldLayout,
  ScaffoldPartProps,
  ScaffoldProps,
} from './use-scaffold-layout';

function resizeList(
  nextWidth: number,
  { sidebarShown, onSidebarShownChange }: ScaffoldProps,
  { measures, listLimit, setPreferredListWidth }: ScaffoldLayout,
): void {
  if (nextWidth < measures.listWidth / 2) {
    onSidebarShownChange(false);

    return;
  }

  setPreferredListWidth(
    Math.max(measures.listWidth, Math.min(listMaximum, listLimit, nextWidth)),
  );

  if (!sidebarShown) onSidebarShownChange(true);
}

function snappedInspectorState(
  nextWidth: number,
  layout: ScaffoldLayout,
): InspectorState | undefined {
  if (nextWidth < layout.measures.inspectorWidth / 2) return 'closed';

  if (nextWidth > layout.availableWidth - detailMinimum / 2) return 'expanded';

  return undefined;
}

function isInspectorBeside(layout: ScaffoldLayout): boolean {
  return layout.inspectorOpen && !layout.inspectorExpanded;
}

function clampedInspectorWidth(
  nextWidth: number,
  layout: ScaffoldLayout,
): number {
  return Math.max(
    layout.measures.inspectorWidth,
    Math.min(layout.availableWidth - detailMinimum, nextWidth),
  );
}

function resizeInspector(
  nextWidth: number,
  scaffold: ScaffoldProps,
  layout: ScaffoldLayout,
): void {
  const snapped = snappedInspectorState(nextWidth, layout);

  if (snapped) {
    scaffold.onInspectorStateChange(snapped);

    return;
  }

  layout.setPreferredInspectorWidth(clampedInspectorWidth(nextWidth, layout));

  if (!isInspectorBeside(layout)) scaffold.onInspectorStateChange('open');
}

function listHandleProps({
  scaffold,
  layout,
}: ScaffoldPartProps): PanelResizeHandleProps {
  return {
    label: 'Resize sidebar',
    value: layout.shownListWidth,
    minimum: 0,
    maximum: Math.min(listMaximum, layout.listLimit),
    direction: 1,
    onChange: (nextWidth) => resizeList(nextWidth, scaffold, layout),
    onDragStateChange: layout.setResizing,
  };
}

function inspectorHandleProps({
  scaffold,
  layout,
}: ScaffoldPartProps): PanelResizeHandleProps {
  return {
    label: 'Resize Inspector',
    edge: 'left',
    value: layout.inspectorTargetWidth,
    minimum: 0,
    maximum: layout.availableWidth,
    direction: -1,
    onChange: (nextWidth) => resizeInspector(nextWidth, scaffold, layout),
    onDragStateChange: layout.setResizing,
  };
}

function ListResizeHandle(parts: ScaffoldPartProps): React.JSX.Element | null {
  const { layout } = parts;

  // A medium window's list keeps its fixed width (#927).
  if (parts.scaffold.sizeClass !== 'wide') return null;

  if (layout.listLimit <= layout.measures.listWidth) return null;

  return (
    <View
      className="absolute top-0 bottom-frame-inset z-40"
      style={{ left: layout.listHandleLeft }}
    >
      <PanelResizeHandle {...listHandleProps(parts)} />
    </View>
  );
}

function InspectorResizeHandle(
  parts: ScaffoldPartProps,
): React.JSX.Element | null {
  // Only a wide window has the Inspector's column.
  if (parts.scaffold.sizeClass !== 'wide') return null;

  return (
    <View
      className="absolute top-0 bottom-0 z-30"
      style={{ left: parts.layout.inspectorHandleLeft }}
    >
      <PanelResizeHandle {...inspectorHandleProps(parts)} />
    </View>
  );
}

export function ScaffoldResizeHandles(
  parts: ScaffoldPartProps,
): React.JSX.Element {
  return (
    <>
      <ListResizeHandle {...parts} />
      <InspectorResizeHandle {...parts} />
    </>
  );
}
