import type * as React from 'react';
import { View } from 'react-native';
import {
  PanelResizeHandle,
  type PanelResizeHandleProps,
} from '../components/panel-resize-handle/panel-resize-handle';
import {
  type ResizeHandle,
  type ResizeOutcome,
  resizeOutcome,
} from './frame-layout';
import { moveInspector } from './inspector-column';
import type {
  ScaffoldLayout,
  ScaffoldPartProps,
  ScaffoldProps,
} from './use-scaffold-layout';

// The list never expands, so any outcome other than a width closes it.
function resizeList(
  outcome: ResizeOutcome,
  { sidebarShown, onSidebarShownChange }: ScaffoldProps,
  { setPreferredListWidth }: ScaffoldLayout,
): void {
  if (typeof outcome !== 'number') {
    onSidebarShownChange(false);

    return;
  }

  setPreferredListWidth(outcome);

  if (!sidebarShown) onSidebarShownChange(true);
}

function resizeInspector(
  outcome: ResizeOutcome,
  scaffold: ScaffoldProps,
  { setPreferredInspectorWidth }: ScaffoldLayout,
): void {
  if (typeof outcome === 'number') setPreferredInspectorWidth(outcome);

  moveInspector(scaffold, { dragged: outcome });
}

function handleProps(
  handle: ResizeHandle,
  { setResizing }: ScaffoldLayout,
): Pick<
  PanelResizeHandleProps,
  'value' | 'minimum' | 'maximum' | 'onDragStateChange'
> {
  return {
    value: handle.value,
    minimum: 0,
    maximum: handle.reach,
    onDragStateChange: setResizing,
  };
}

function listHandleProps(
  handle: ResizeHandle,
  { scaffold, layout }: ScaffoldPartProps,
): PanelResizeHandleProps {
  return {
    ...handleProps(handle, layout),
    label: 'Resize sidebar',
    direction: 1,
    onChange: (width) =>
      resizeList(resizeOutcome(handle, width), scaffold, layout),
  };
}

function inspectorHandleProps({
  scaffold,
  layout,
}: ScaffoldPartProps): PanelResizeHandleProps {
  const handle = layout.handles.inspector;

  return {
    ...handleProps(handle, layout),
    label: 'Resize Inspector',
    edge: 'left',
    direction: -1,
    onChange: (width) =>
      resizeInspector(resizeOutcome(handle, width), scaffold, layout),
  };
}

function ListResizeHandle(parts: ScaffoldPartProps): React.JSX.Element | null {
  const handle = parts.layout.handles.list;

  // Only a wide window frames the page, so only it resizes its panes.
  if (parts.scaffold.sizeClass !== 'wide' || !handle) return null;

  return (
    <View
      className="absolute top-0 bottom-frame-inset z-40"
      style={{ left: handle.left }}
    >
      <PanelResizeHandle {...listHandleProps(handle, parts)} />
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
      style={{ left: parts.layout.handles.inspector.left }}
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
