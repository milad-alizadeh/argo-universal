import { useWide } from '@repo/kit/use-wide/use-wide';
import { useCallback } from 'react';
import { go, type Navigate } from './navigation';
import { pathShown } from './shown-page';

/*
 * `useNavigate` for a part that navigates only on a press. It reads the page shown at the press and not on each
 * render, so the function keeps one identity and its caller is not redrawn when the path changes: a Session page kept
 * behind the shown one, or the Sessions list's rows.
 */
export function useNavigateFromShown(): Navigate {
  const wide = useWide();

  return useCallback<Navigate>(
    (href, options) => go(href, { shown: pathShown(), wide }, options ?? {}),
    [wide],
  );
}
