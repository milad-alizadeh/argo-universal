import { useSyncExternalStore } from 'react';
import { type SizeClass, sizeClass } from './size-class';

interface Breakpoints {
  medium: MediaQueryList;
  wide: MediaQueryList;
}

// Read once and shared: the tokens never change, and a computed-style read in every caller's render adds up across a page.
let breakpoints: Breakpoints | undefined;

// A breakpoint token from tooling/uniwind/theme.css, which is empty until the stylesheet has loaded.
const tokenLength = (token: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(token).trim();

function readBreakpoints(): Breakpoints | undefined {
  const medium = tokenLength('--breakpoint-medium');
  const wide = tokenLength('--breakpoint-wide');

  if (medium === '' || wide === '') return;

  return {
    medium: window.matchMedia(`(min-width: ${medium})`),
    wide: window.matchMedia(`(min-width: ${wide})`),
  };
}

function loadedBreakpoints(): Breakpoints | undefined {
  breakpoints ??= readBreakpoints();

  return breakpoints;
}

/*
 * The tokens are empty until the stylesheet has loaded, so a store subscribed before then has no query to listen to, and a
 * viewport that settles afterwards would leave it on the size class it first read. A resize reads the snapshot again, which
 * loads the queries then, so it is listened to as well; the queries' own change events still say when a breakpoint is crossed.
 */
function subscribe(listener: () => void): () => void {
  const queries = loadedBreakpoints();
  queries?.medium.addEventListener('change', listener);
  queries?.wide.addEventListener('change', listener);
  window.addEventListener('resize', listener);

  return (): void => {
    queries?.medium.removeEventListener('change', listener);
    queries?.wide.removeEventListener('change', listener);
    window.removeEventListener('resize', listener);
  };
}

const matches = (query: MediaQueryList | undefined): boolean =>
  query?.matches === true;

// The web is never a phone: a narrow browser window is compact by width alone.
const windowSizeClass = (): SizeClass => {
  const queries = loadedBreakpoints();

  return sizeClass({
    medium: matches(queries?.medium),
    wide: matches(queries?.wide),
    phone: false,
  });
};

const serverSizeClass = (): SizeClass => 'compact';

export function useSizeClass(): SizeClass {
  return useSyncExternalStore(subscribe, windowSizeClass, serverSizeClass);
}
