import { hasLiquidGlass } from '@repo/kit/native-header';
import { useWide } from '@repo/kit/use-wide/use-wide';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import type * as React from 'react';
import { type ReactNode, useContext } from 'react';
import { View } from 'react-native';
import { SessionColumn } from './session-column';

// Only a narrow page's Liquid Glass header floats over it; an opaque header, or a wide window's own, sits above the page.
const headerFloats = (wide: boolean): boolean => hasLiquidGlass && !wide;

/*
 * The bar moves down by a floating header's height. Below the bar, the Feed no longer meets the header, so it takes
 * no inset of its own.
 */
function useFloatingHeaderHeight(): number {
  const headerHeight = useContext(HeaderHeightContext);

  return headerFloats(useWide()) ? (headerHeight ?? 0) : 0;
}

// One line under the Session's header, in the Session's column; nothing while there is none.
export function SessionBarRow(props: { children: ReactNode }): React.ReactNode {
  const top = useFloatingHeaderHeight();

  if (!props.children) return null;

  return (
    <View style={{ paddingTop: top }}>
      <SessionColumn className="pt-2">{props.children}</SessionColumn>
    </View>
  );
}
