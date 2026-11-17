import { usePathname, useUnstableGlobalHref } from 'expo-router';
import { useEffect } from 'react';

/*
 * The page the Frame shows, as a link and as a path: what a page opened from it is told to return to, and where a
 * press navigates from. The Frame reports it on every change, so it is read at the press, before the new page is
 * shown, and a part that only navigates on a press need not redraw each time the path changes.
 */
let shownPage: string | undefined;

let shownPath: string | undefined;

// The Frame's navigator calls it once; the page shown is then there for the next press.
export function useRememberShownPage(): void {
  const href = useUnstableGlobalHref();
  const path = usePathname();

  useEffect(() => {
    shownPage = href;
    shownPath = path;
  }, [href, path]);
}

export const pageShown = (): string | undefined => shownPage;

// Without a Frame there is no page to navigate from, as at a section's root.
export const pathShown = (): string => shownPath ?? '';
