import { Stack } from 'expo-router';
import type * as React from 'react';

// A header item's dot: Material's empty badge on Android; iOS shows the state in the item's own menu instead.
export function toolbarDot(shown: boolean): React.JSX.Element | null {
  return process.env.EXPO_OS === 'android' && shown ? (
    <Stack.Toolbar.Badge />
  ) : null;
}
