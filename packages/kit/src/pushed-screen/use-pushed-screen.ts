import { useRouter } from 'expo-router';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  forgetPushedScreen,
  isRouted,
  newScreenId,
  releasePushedScreen,
  showPushedScreen,
  subscribePushedScreens,
} from './pushed-screen-store';

interface PushedScreen {
  // The page's content, called only while it is shown.
  content: () => ReactNode;
  // Called once the page has left the stack.
  onExit?: () => void;
}

/*
 * Pushes a page on the screen's own navigation stack, the App's Expo Router stack or a story's `withStack`, through
 * the one route `/screen/[id]` that both define. Returns the press that pushes it. The page stays current with this
 * component's props while it is shown, and `onExit` runs when Back (or `router.back()`) takes it away.
 */
export function usePushedScreen(page: PushedScreen): () => void {
  const router = useRouter();
  const [id] = useState(newScreenId);
  const [open, setOpen] = useState(false);
  useLiveContent(id, open, page.content);

  useExit(id, open, () => {
    setOpen(false);
    page.onExit?.();
  });

  return () => {
    showPushedScreen(id, page.content());
    setOpen(true);
    router.push({ pathname: '/screen/[id]', params: { id } });
  };
}

function useLiveContent(
  id: string,
  open: boolean,
  content: () => ReactNode,
): void {
  useLayoutEffect(() => {
    if (open) showPushedScreen(id, content());
  });

  // The opener unmounting lets go of the page, or leaves it for Back when it is still drawn.
  useEffect(
    () => (): void => {
      releasePushedScreen(id);
    },
    [id],
  );
}

const left = (open: boolean, was: boolean, now: boolean): boolean =>
  open && was && !now;

// Back is seen as the route going from drawn to gone, after which the opener lets go of the page's content.
function useExit(id: string, open: boolean, leave: () => void): void {
  const routed = useSyncExternalStore(subscribePushedScreens, () =>
    isRouted(id),
  );

  const wasRouted = useRef(false);

  useEffect(() => {
    if (left(open, wasRouted.current, routed)) {
      forgetPushedScreen(id);
      leave();
    }

    wasRouted.current = routed;
  });
}
