import { useUnstableGlobalHref } from 'expo-router';
import { useEffect } from 'react';

/*
 * The page the Frame shows, as a link: what a page opened from it is told to return to. The Frame reports it on every
 * change, so it is read at the press, before the new page is shown.
 */
let shownPage: string | undefined;

// The Frame's navigator calls it once; the page shown is then there for the next press.
export function useRememberShownPage(): void {
  const href = useUnstableGlobalHref();

  useEffect(() => {
    shownPage = href;
  }, [href]);
}

export const pageShown = (): string | undefined => shownPage;
