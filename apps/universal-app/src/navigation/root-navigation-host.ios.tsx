import { useShowsServer } from '@repo/client';
import { Slot } from 'expo-router';
import type { JSX } from 'react';
import { nativeFrame } from './native-frame';
import { SplitViewRoot } from './split-view-root';

export function RootNavigationHost(): JSX.Element {
  const showsServer = useShowsServer();

  return nativeFrame && showsServer ? <SplitViewRoot /> : <Slot />;
}
