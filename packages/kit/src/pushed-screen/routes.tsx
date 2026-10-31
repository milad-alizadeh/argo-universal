import { Redirect, useLocalSearchParams } from 'expo-router';
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { ScreenNavigationEnabled } from '#primitives/scaffolds/screen';
import {
  hasPushedScreen,
  pushedContent,
  routePushedScreen,
  subscribePushedScreens,
} from './pushed-screen-store';

// An address no route answers, so the router's own not-found page takes it.
const unknownAddress = '/screen-not-found';

/*
 * The one route (`/screen/[id]`) every pushed page uses: the App's `app/screen/[id].tsx` and a story's `withStack` both
 * render it. An id no opener has pushed (a link, a reload) names no page, so it goes where any unknown address goes.
 */
export function PushedScreenRoute(): ReactNode {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Read once, as the page mounts: an opener that unmounts while its page leaves must not send the leaving page away.
  const [isPushed] = useState(() => hasPushedScreen(id));

  if (!isPushed) return <Redirect href={unknownAddress} />;

  return <PushedPage id={id} />;
}

function PushedPage({ id }: { id: string }): ReactNode {
  const content = useSyncExternalStore(subscribePushedScreens, () =>
    pushedContent(id),
  );

  useEffect(() => {
    routePushedScreen(id, true);

    return (): void => routePushedScreen(id, false);
  }, [id]);

  return <ScreenNavigationEnabled value>{content}</ScreenNavigationEnabled>;
}
