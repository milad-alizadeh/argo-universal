import path from 'node:path';
import { chooseTests, type TestScope } from './verify-scope.mts';

/*
 * A change here reaches every drawing without passing through a story's imports: the preview, the theme,
 * the dependencies, and the gate itself.
 */
const DRAWS_EVERYTHING = [
  /^apps\/storybook\//,
  /^tooling\//,
  /^tools\/(check-)?story-(render|file)/,
  /(^|\/)package\.json$/,
  /^pnpm-lock\.yaml$/,
  /\.css$/,
];

interface ScopeInput {
  // Paths relative to `root`, as git names them.
  changed: string[];
  // Absolute paths, as `vitest list` names the story files that import a changed file.
  dependents: string[];
  root: string;
}

export type RenderScope = { all: true } | { all: false; files: Set<string> };

// The presentation files to draw for a change: the ones whose module graph it reaches, or all of them.
export function renderScope({
  changed,
  dependents,
  root,
}: ScopeInput): RenderScope {
  if (changed.some((file) => DRAWS_EVERYTHING.some((rule) => rule.test(file))))
    return { all: true };

  const files = new Set(dependents.map((file) => relativeTo(root, file)));

  return { all: false, files };
}

const relativeTo = (root: string, file: string): string =>
  path.relative(root, file).split(path.sep).join('/');

// About ten minutes of drawing on a CI runner across the shards.
export const RENDER_LIMIT = 60;

interface CapInput {
  // Paths relative to `root`: the presentation files the change reaches.
  files: string[];
  changed: string[];
  root: string;
  limit?: number;
}

// As `pnpm verify` does with tests: past the limit, only the files in the touched folders; the push to main draws the rest.
export function capScope({
  files,
  changed,
  root,
  limit = RENDER_LIMIT,
}: CapInput): TestScope {
  const scope = chooseTests({
    tests: files.map((file) => path.join(root, file)),
    changed,
    root,
    limit,
  });

  return {
    ...scope,
    files: scope.files.map((file) => relativeTo(root, file)),
  };
}
