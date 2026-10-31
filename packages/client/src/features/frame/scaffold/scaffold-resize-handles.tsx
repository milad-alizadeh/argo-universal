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
import { inspectorOffered, moveInspector } from './inspector-column';
import type { PartReads, ScaffoldLayout } from './use-scaffold-layout';

type ListHandleReads = PartReads<
  'sidebarShown' | 'onSidebarShownChange',
  'handles' | 'setPreferredListWidth' | 'setResizing'
>;

type InspectorHandleReads = PartReads<
  'inspectorState' | 'onInspectorStateChange' | 'band' | 'inspectorAvailable',
  'handles' | 'inspector' | 'setPreferredInspectorWidth' | 'setResizing'
>;

// The list never expands, so any outcome other than a width closes it.
function resizeList(
  outcome: ResizeOutcome,
  { sidebarShown, onSidebarShownChange }: ListHandleReads['scaffold'],
  { setPreferredListWidth }: ListHandleReads['layout'],
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
  scaffold: InspectorHandleReads['scaffold'],
  { setPreferredInspectorWidth }: InspectorHandleReads['layout'],
): void {
  if (typeof outcome === 'number') setPreferredInspectorWidth(outcome);

  moveInspector(scaffold, { dragged: outcome });
}

function handleProps(
  handle: ResizeHandle,
  { setResizing }: Pick<ScaffoldLayout, 'setResizing'>,
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
  { scaffold, layout }: ListHandleReads,
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
}: InspectorHandleReads): PanelResizeHandleProps {
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

function ListResizeHandle(parts: ListHandleReads): React.JSX.Element | null {
  const handle = parts.layout.handles.list;

  if (!handle) return null;

  return (
    <View
      className="absolute top-0 bottom-frame-inset z-40"
      style={{ left: handle.left }}
    >
      <PanelResizeHandle {...listHandleProps(handle, parts)} />
    </View>
  );
}

// A window with no Session has no Inspector to resize, so it draws no handle for one, and the handle takes no Tab stop.
function InspectorResizeHandle(
  parts: InspectorHandleReads,
): React.JSX.Element | null {
  if (!parts.layout.inspector.open && !inspectorOffered(parts.scaffold))
    return null;

  return (
    <View
      className="absolute top-0 bottom-0 z-30"
      style={{ left: parts.layout.handles.inspector.left }}
    >
      <PanelResizeHandle {...inspectorHandleProps(parts)} />
    </View>
  );
}

type ResizeHandlesReads = ListHandleReads & InspectorHandleReads;

// Drawn among a framed window's overlays only, so it never checks the Size class: only a wide window resizes its panes.
export function ScaffoldResizeHandles(
  parts: ResizeHandlesReads,
): React.JSX.Element {
  return (
    <>
      <ListResizeHandle {...parts} />
      <InspectorResizeHandle {...parts} />
    </>
  );
}
