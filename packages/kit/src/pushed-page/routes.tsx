import { useLocalSearchParams } from 'expo-router';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { PageNavigationEnabled } from '#primitives/scaffolds/page';
import {
  pushedContent,
  routePushedPage,
  subscribePushedPages,
} from './pushed-page-store';

// The one route (`/page/[id]`) every pushed page uses: the App's `app/page/[id].tsx` and a story's `withStack` both render it.
export function PushedPageRoute(): ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>();

  const content = useSyncExternalStore(subscribePushedPages, () =>
    pushedContent(id),
  );

  useEffect(() => {
    routePushedPage(id, true);

    return (): void => routePushedPage(id, false);
  }, [id]);

  return <PageNavigationEnabled value>{content}</PageNavigationEnabled>;
}
