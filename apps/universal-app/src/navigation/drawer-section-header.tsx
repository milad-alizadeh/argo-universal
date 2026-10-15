import type { ScreenHeaderProps } from '@repo/client';
import { useNavigation } from 'expo-router';
import type { DrawerNavigationProp } from 'expo-router/drawer';
import type { ParamListBase } from 'expo-router/react-navigation';
import { useLayoutEffect } from 'react';
import { sectionHeaderOptions } from './section-header-options';

// An Android section root's header is its drawer screen's: the drawer draws ☰ and the title, and this sets the title, the trailing items and the search.
export function DrawerSectionHeader(header: ScreenHeaderProps): null {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation
      .getParent<DrawerNavigationProp<ParamListBase>>()
      ?.setOptions(sectionHeaderOptions(header));
  });

  return null;
}
