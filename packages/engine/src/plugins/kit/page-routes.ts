import type { Page, PageParams } from '@repo/contracts/plugins/argo-api';

export type PageMatch = { page: Page; params: PageParams };

// One segment of a pattern: a literal must equal its path segment; a `:name` captures any non-empty one.
type Segment = (actual: string, params: Record<string, string>) => boolean;

type Pattern = {
  path: string;
  segments: string[];
  matchers: Segment[];
  page: Page;
};

type Routes = { exact: Map<string, Page>; patterns: Pattern[] };

export interface PageRoutes {
  register: (path: string, page: Page) => void;
  // The page a path opens: its exact registration first, else the one pattern that matches it.
  match: (path: string) => PageMatch | undefined;
}

const segmentsOf = (path: string): string[] => path.split('/').slice(1);

const isParam = (segment: string): boolean => segment.startsWith(':');

const captures =
  (name: string): Segment =>
  (actual, params) => {
    params[name] = actual;

    return actual !== '';
  };

const matcherOf = (segment: string): Segment =>
  isParam(segment)
    ? captures(segment.slice(1))
    : (actual) => actual === segment;

const patternOf = (path: string, page: Page): Pattern => {
  const segments = segmentsOf(path);

  return { path, segments, matchers: segments.map(matcherOf), page };
};

const either = (one: string, other: string): boolean =>
  one === other || isParam(one) || isParam(other);

// Two patterns match the same paths when, segment by segment, each pair is equal or either is a `:name`.
const overlaps = (one: string[], other: string[]): boolean =>
  one.length === other.length &&
  one.every((segment, index) => either(segment, other[index] ?? ''));

function matchOf(pattern: Pattern, path: string[]): PageMatch | undefined {
  const params: Record<string, string> = {};

  const matches =
    pattern.matchers.length === path.length &&
    path.every((actual, index) => pattern.matchers[index]?.(actual, params));

  return matches
    ? { page: pattern.page, params: Object.freeze(params) }
    : undefined;
}

function refuseClash(clash: Pattern, path: string): void {
  if (clash.path !== path)
    throw new Error(`${path} matches the same paths as ${clash.path}`);
}

// A pattern that matches the same paths as another is refused, so no path is ever open to two pages.
function registerPattern(patterns: Pattern[], path: string, page: Page): void {
  const pattern = patternOf(path, page);

  const clash = patterns.find((other) =>
    overlaps(other.segments, pattern.segments),
  );

  if (!clash) {
    patterns.push(pattern);

    return;
  }

  refuseClash(clash, path);
  clash.page = page;
}

function register(routes: Routes, path: string, page: Page): void {
  if (segmentsOf(path).some(isParam))
    registerPattern(routes.patterns, path, page);
  else routes.exact.set(path, page);
}

const noParams: PageParams = Object.freeze({});

const matchPattern = (
  patterns: Pattern[],
  path: string,
): PageMatch | undefined => {
  const segments = segmentsOf(path);

  return patterns
    .map((pattern) => matchOf(pattern, segments))
    .find((matched) => matched !== undefined);
};

function match(routes: Routes, path: string): PageMatch | undefined {
  const page = routes.exact.get(path);

  return page
    ? { page, params: noParams }
    : matchPattern(routes.patterns, path);
}

/*
 * A Plugin's pages by path. A path is exact, or a pattern whose `:name` segments each match one segment and
 * reach the page as `params`, so a page opens from its link however the App reached it.
 */
export function pageRoutes(): PageRoutes {
  const routes: Routes = { exact: new Map(), patterns: [] };

  return {
    register: (path, page) => register(routes, path, page),
    match: (path) => match(routes, path),
  };
}
