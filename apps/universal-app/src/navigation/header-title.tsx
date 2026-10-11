import { Text, useTextStyle } from '@repo/client';
import type { NativeStackNavigationOptions } from 'expo-router';
import type { JSX } from 'react';
import { Platform } from 'react-native';

type HeaderTitleOptions = Pick<
  NativeStackNavigationOptions,
  'headerTitle' | 'headerTitleStyle'
>;

export function useHeaderTitleOptions(): HeaderTitleOptions {
  const headerTitleStyle = useTextStyle('nav-title');
  // CSS loads after the web style resolver's first snapshot; draw the role directly.
  return Platform.OS === 'web'
    ? { headerTitle: HeaderTitle }
    : { headerTitleStyle };
}

function HeaderTitle({ children }: { children: string }): JSX.Element {
  return (
    <Text
      role="nav-title"
      semanticRole="heading"
      aria-level={1}
      numberOfLines={1}
      className="font-sans"
    >
      {children}
    </Text>
  );
}
