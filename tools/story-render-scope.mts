import path from 'node:path';

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

  const files = new Set(
    dependents.map((file) =>
      path.relative(root, file).split(path.sep).join('/'),
    ),
  );

  return { all: false, files };
}
