import { Stack } from 'expo-router';
import type * as React from 'react';

/*
 * A header item's dot: Stack.Toolbar.Badge with no text, a stock UIBarButtonItem badge on iOS 26 and later
 * (earlier iOS draws none) and Material's empty badge on Android. Only a root item in the left or right toolbar takes it.
 */
export function toolbarDot(shown: boolean): React.JSX.Element | null {
  return shown ? <Stack.Toolbar.Badge /> : null;
}
