import type * as React from 'react';
import { View } from 'react-native';
import {
  PanelResizeHandle,
  type PanelResizeHandleProps,
} from '../panel-resize-handle/panel-resize-handle';
import type { DesktopShellProps, InspectorState } from './desktop-shell-props';
import { detailMinimum, listMaximum } from './shell-geometry';
import type { ShellLayout, ShellPartProps } from './use-shell-layout';

function resizeList(
  nextWidth: number,
  { sidebarShown, onSidebarShownChange }: DesktopShellProps,
  { measures, listLimit, setPreferredListWidth }: ShellLayout,
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
  layout: ShellLayout,
): InspectorState | undefined {
  if (nextWidth < layout.measures.inspectorWidth / 2) return 'closed';

  if (nextWidth > layout.availableWidth - detailMinimum / 2) return 'expanded';

  return undefined;
}

function isInspectorBeside(layout: ShellLayout): boolean {
  return layout.inspectorOpen && !layout.inspectorExpanded;
}

function clampedInspectorWidth(nextWidth: number, layout: ShellLayout): number {
  return Math.max(
    layout.measures.inspectorWidth,
    Math.min(layout.availableWidth - detailMinimum, nextWidth),
  );
}

function resizeInspector(
  nextWidth: number,
  shell: DesktopShellProps,
  layout: ShellLayout,
): void {
  const snapped = snappedInspectorState(nextWidth, layout);

  if (snapped) {
    shell.onInspectorStateChange(snapped);

    return;
  }

  layout.setPreferredInspectorWidth(clampedInspectorWidth(nextWidth, layout));

  if (!isInspectorBeside(layout)) shell.onInspectorStateChange('open');
}

function listHandleProps({
  shell,
  layout,
}: ShellPartProps): PanelResizeHandleProps {
  return {
    label: 'Resize sidebar',
    value: layout.shownListWidth,
    minimum: 0,
    maximum: Math.min(listMaximum, layout.listLimit),
    direction: 1,
    onChange: (nextWidth) => resizeList(nextWidth, shell, layout),
    onDragStateChange: layout.setResizing,
  };
}

function inspectorHandleProps({
  shell,
  layout,
}: ShellPartProps): PanelResizeHandleProps {
  return {
    label: 'Resize Inspector',
    edge: 'left',
    value: layout.inspectorTargetWidth,
    minimum: 0,
    maximum: layout.availableWidth,
    direction: -1,
    onChange: (nextWidth) => resizeInspector(nextWidth, shell, layout),
    onDragStateChange: layout.setResizing,
  };
}

function ListResizeHandle(parts: ShellPartProps): React.JSX.Element | null {
  const { layout } = parts;

  if (layout.listLimit <= layout.measures.listWidth) return null;

  return (
    <View
      className="absolute top-0 bottom-shell-inset z-40"
      style={{ left: layout.listHandleLeft }}
    >
      <PanelResizeHandle {...listHandleProps(parts)} />
    </View>
  );
}

function InspectorResizeHandle(parts: ShellPartProps): React.JSX.Element {
  return (
    <View
      className="absolute top-0 bottom-0 z-30"
      style={{ left: parts.layout.inspectorHandleLeft }}
    >
      <PanelResizeHandle {...inspectorHandleProps(parts)} />
    </View>
  );
}

export function ShellResizeHandles(parts: ShellPartProps): React.JSX.Element {
  return (
    <>
      <ListResizeHandle {...parts} />
      <InspectorResizeHandle {...parts} />
    </>
  );
}
