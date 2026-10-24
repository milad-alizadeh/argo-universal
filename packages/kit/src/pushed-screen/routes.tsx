import { useLocalSearchParams } from 'expo-router';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { ScreenNavigationEnabled } from '#primitives/scaffolds/screen';
import {
  pushedContent,
  routePushedScreen,
  subscribePushedScreens,
} from './pushed-screen-store';

// The one route (`/screen/[id]`) every pushed page uses: the App's `app/screen/[id].tsx` and a story's `withStack` both render it.
export function PushedScreenRoute(): ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>();

  const content = useSyncExternalStore(subscribePushedScreens, () =>
    pushedContent(id),
  );

  useEffect(() => {
    routePushedScreen(id, true);

    return (): void => routePushedScreen(id, false);
  }, [id]);

  return <ScreenNavigationEnabled value>{content}</ScreenNavigationEnabled>;
}
