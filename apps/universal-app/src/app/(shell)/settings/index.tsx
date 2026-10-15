import { SectionRootScreen, useWide } from '@repo/client';
import { useFocusEffect, useNavigation } from 'expo-router';
import { CommonActions } from 'expo-router/react-navigation';
import type * as React from 'react';
import { useCallback } from 'react';

const firstPage = 'accounts';

// On a wide window the list sits beside the pages, so Settings opens its first page; the list stays below it for a narrow window's Back.
function OpenFirstPage(): null {
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [{ name: 'index' }, { name: firstPage }],
        }),
      );
    }, [navigation]),
  );

  return null;
}

export default function SettingsRoute(): React.JSX.Element {
  if (useWide()) return <OpenFirstPage />;

  return <SectionRootScreen section="settings" />;
}
