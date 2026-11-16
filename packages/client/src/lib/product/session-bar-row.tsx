import { useFloatingHeaderHeight } from '@repo/kit/floating-header';
import type * as React from 'react';
import { type ReactNode } from 'react';
import { View } from 'react-native';
import { useHasWorkbench } from './content-layout';
import { SessionColumn } from './session-column';

// The bar's tinted strip, edge to edge; the Session column sets the line's sides.
export function SessionBarStrip(props: {
  children: ReactNode;
}): React.JSX.Element {
  return <View className="w-full bg-muted py-2">{props.children}</View>;
}

/*
 * One tinted strip under a phone's Session header, moved down by a floating header's height, its line on the Session column's leading edge; nothing while there
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
