import { hasLiquidGlass } from '@repo/kit/native-header';
import { useWide } from '@repo/kit/use-wide/use-wide';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import type * as React from 'react';
import { type ReactNode, useContext } from 'react';
import { View } from 'react-native';
import { useHasWorkbench } from './content-layout';
import { SessionColumn } from './session-column';

// Only a narrow page's Liquid Glass header floats over it; an opaque header, or a wide window's own, sits above the page.
const headerFloats = (wide: boolean): boolean => hasLiquidGlass && !wide;

/*
 * The bar moves down by a floating header's height. Below the bar, the Feed no longer meets the header, so it takes
 * no inset of its own.
 */
export function useFloatingHeaderHeight(): number {
  const headerHeight = useContext(HeaderHeightContext);

  return headerFloats(useWide()) ? (headerHeight ?? 0) : 0;
}

// The bar's tinted strip, edge to edge; the Session column sets the line's sides.
export function SessionBarStrip(props: {
  children: ReactNode;
}): React.JSX.Element {
  return <View className="w-full bg-muted py-2">{props.children}</View>;
}

/*
 * One tinted strip under a phone's Session header, its line on the Session column's leading edge; nothing while there
 * is none. A page with a Workbench has the lines as its cards instead, and they hide with it (#2012).
 */
export function SessionBarRow(props: { children: ReactNode }): React.ReactNode {
  const hasWorkbench = useHasWorkbench();
  const top = useFloatingHeaderHeight();

  if (hasWorkbench || !props.children) return null;

  return (
    <View style={{ paddingTop: top }}>
      <SessionBarStrip>
        <SessionColumn>{props.children}</SessionColumn>
      </SessionBarStrip>
    </View>
  );
}
