import { Text } from '@repo/client';
import type { NativeStackNavigationOptions } from 'expo-router';
import type { JSX } from 'react';
import { Platform } from 'react-native';

type HeaderTitleOptions = Pick<NativeStackNavigationOptions, 'headerTitle'>;

// Native headers keep the stock title; CSS loads after the web style resolver's first snapshot, so the web draws the role directly.
export const headerTitleOptions: HeaderTitleOptions =
  Platform.OS === 'web' ? { headerTitle: HeaderTitle } : {};

function HeaderTitle({ children }: { children: string }): JSX.Element {
  return (
    <Text
      role="nav-title"
      accessibilityRole="heading"
      aria-level={1}
      numberOfLines={1}
      className="font-sans"
    >
      {children}
    </Text>
  );
}
