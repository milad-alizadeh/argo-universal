import type { ScreenHeaderProps } from '@repo/client';
import { Stack } from 'expo-router';
import type * as React from 'react';
import { webHeaderOptions } from './header-options';

// A narrow web window's page header, which a page in @repo/client sets through `ScreenHeader`. It sets only the header's content: whether the header shows is the section stack's, by width.
export function WebScreenHeader(header: ScreenHeaderProps): React.JSX.Element {
  return <Stack.Screen options={webHeaderOptions(header)} />;
}
