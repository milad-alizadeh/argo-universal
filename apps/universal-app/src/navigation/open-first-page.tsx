import { useFocusEffect, useNavigation } from 'expo-router';
import { CommonActions } from 'expo-router/react-navigation';
import { useCallback } from 'react';

// On a wide window the list sits beside the pages, so a section opens its first page; the list stays below it for a narrow window's Back.
export function OpenFirstPage({ page }: { page: string }): null {
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [{ name: 'index' }, { name: page }],
        }),
      );
    }, [navigation, page]),
  );

  return null;
}
