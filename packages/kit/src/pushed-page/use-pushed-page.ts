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
  forgetPushedPage,
  isRouted,
  newPageId,
  showPushedPage,
  subscribePushedPages,
} from './pushed-page-store';

interface PushedPage {
  // The page's content, called only while it is shown.
  content: () => ReactNode;
  // Called once the page has left the stack.
  onExit?: () => void;
}

/*
 * Pushes a page on the screen's own navigation stack, the App's Expo Router stack or a story's `withStack`, through
 * the one route `/page/[id]` that both define. Returns the press that pushes it. The page stays current with this
 * component's props while it is shown, and `onExit` runs when Back (or `router.back()`) takes it away.
 */
export function usePushedPage(page: PushedPage): () => void {
  const router = useRouter();
  const [id] = useState(newPageId);
  const [open, setOpen] = useState(false);
  useLiveContent(id, open, page.content);

  useExit(id, open, () => {
    setOpen(false);
    page.onExit?.();
  });

  return () => {
    showPushedPage(id, page.content());
    setOpen(true);
    router.push({ pathname: '/page/[id]', params: { id } });
  };
}

function useLiveContent(
  id: string,
  open: boolean,
  content: () => ReactNode,
): void {
  useLayoutEffect(() => {
    if (open) showPushedPage(id, content());
  });
}

const left = (open: boolean, was: boolean, now: boolean): boolean =>
  open && was && !now;

// Back is seen as the route going from drawn to gone, after which the opener lets go of the page's content.
function useExit(id: string, open: boolean, leave: () => void): void {
  const routed = useSyncExternalStore(subscribePushedPages, () => isRouted(id));
  const wasRouted = useRef(false);

  useEffect(() => {
    if (left(open, wasRouted.current, routed)) {
      forgetPushedPage(id);
      leave();
    }

    wasRouted.current = routed;
  });
}
