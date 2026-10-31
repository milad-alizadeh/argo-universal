import { sectionOf } from './sections';

const sectionOfLink = (link: string): string =>
  sectionOf(link.split(/[?#]/u)[0]);

/*
 * A page in another section sits over its own section's list, so a stack's Back would go to that list rather than to
 * the page it was opened from. The page carries the one it was opened from, and the stack's Back goes there. Opened from
 * its own section, a page's Back already goes to the right page, so it carries nothing.
 */
export type ReturnParams = { returnTo?: string };

export function returnParams(target: string, from?: string): ReturnParams {
  if (!from || sectionOfLink(from) === sectionOfLink(target)) return {};

  // useLocalSearchParams decodes every param once more, so a link with `%2F` in it would arrive as `/`.
  return { returnTo: encodeURIComponent(from) };
}

// What a page's route params may carry; the rest of them are the page's own.
interface Carried {
  returnTo?: unknown;
}

// The page a page was opened from, when it was opened from another section.
export function returnToOf(params?: Carried): string | undefined {
  const link = params?.returnTo;

  return typeof link === 'string' ? decodeURIComponent(link) : undefined;
}
