import { useState } from 'react';
import { type LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { useCSSVariable } from 'uniwind';
import type { DesktopShellProps } from './desktop-shell-props';
import {
  type ShellGeometry,
  type ShellMeasures,
  shellGeometry,
} from './shell-geometry';

interface ShellMotion {
  transitionKey: string;
  animate: boolean;
}

interface PreferredWidths {
  preferredListWidth: number;
  preferredInspectorWidth: number;
  setPreferredListWidth: (width: number) => void;
  setPreferredInspectorWidth: (width: number) => void;
}

interface WindowWidth {
  width: number;
  onLayout: (event: LayoutChangeEvent) => void;
}

export interface ShellLayout
  extends ShellGeometry, PreferredWidths, WindowWidth {
  measures: ShellMeasures;
  motion: ShellMotion;
  setResizing: (resizing: boolean) => void;
}

export interface ShellPartProps {
  shell: DesktopShellProps;
  layout: ShellLayout;
}

function useCSSPixels(name: string): number {
  return Number.parseFloat(String(useCSSVariable(name)));
}

function useShellMeasures(): ShellMeasures {
  return {
    listWidth: useCSSPixels('--spacing-shell-list'),
    inspectorWidth: useCSSPixels('--spacing-shell-inspector'),
    railWidth: useCSSPixels('--spacing-shell-rail'),
    inset: useCSSPixels('--spacing-shell-inset'),
  };
}

function usePreferredWidths(measures: ShellMeasures): PreferredWidths {
  const [preferredListWidth, setPreferredListWidth] = useState(
    measures.listWidth,
  );
  const [preferredInspectorWidth, setPreferredInspectorWidth] = useState(
    measures.inspectorWidth,
  );
  return {
    preferredListWidth,
    preferredInspectorWidth,
    setPreferredListWidth,
    setPreferredInspectorWidth,
  };
}

// The window's width until the shell measures itself: a pane first laid out at 0 wide pins the Feed's list to that width.
function useWindowWidth(): WindowWidth {
  const [width, setWidth] = useState(useWindowDimensions().width);
  return {
    width,
    onLayout: ({ nativeEvent }) => setWidth(nativeEvent.layout.width),
  };
}

function useShellWidths(): PreferredWidths & { measures: ShellMeasures } {
  const measures = useShellMeasures();
  return { measures, ...usePreferredWidths(measures) };
}

export function useShellLayout(shell: DesktopShellProps): ShellLayout {
  const widths = useShellWidths();
  const windowWidth = useWindowWidth();
  const [resizing, setResizing] = useState(false);
  const geometry = shellGeometry({ ...shell, ...widths, ...windowWidth });
  return {
    ...geometry,
    ...widths,
    ...windowWidth,
    motion: { transitionKey: geometry.transitionKey, animate: !resizing },
    setResizing,
  };
}
