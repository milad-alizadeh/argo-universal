import path from 'node:path';

// About 40 seconds of story tests at the local worker count; a primitive's edit reaches about 280 of 328 story files.
export const DEPENDENT_LIMIT = 40;

interface ScopeInput {
  // Absolute paths, as `vitest list` names them; a file in two projects appears twice.
  tests: string[];
  // Paths relative to `root`, as git names them.
  changed: string[];
  root: string;
  limit?: number;
}

export interface TestScope {
  files: string[];
  dependents: number;
  narrowed: boolean;
}

const isWithin = (file: string, folder: string): boolean =>
  file.startsWith(`${folder}${path.sep}`);

// Runs every test that depends on the change while they fit the limit; past it, only the tests in the touched folders, and CI runs the rest.
export function chooseTests({
  tests,
  changed,
  root,
  limit = DEPENDENT_LIMIT,
}: ScopeInput): TestScope {
  const files = [...new Set(tests)];

  if (files.length <= limit)
    return { files, dependents: files.length, narrowed: false };

  const folders = touchedFolders(changed, root);

  const inTouchedFolders = files.filter((file): boolean =>
    folders.some((folder): boolean => isWithin(file, folder)),
  );

  return { files: inTouchedFolders, dependents: files.length, narrowed: true };
}

// A root file, such as the lockfile, sits in every folder, so it narrows to nothing.
function touchedFolders(changed: string[], root: string): string[] {
  return [
    ...new Set(changed.map((file) => path.join(root, path.dirname(file)))),
  ].filter((folder): boolean => folder !== root);
}

const LISTED_PATHS = 3;

// An empty change and a change verify does not read both exit 0, so the words must tell them apart.
export function nothingChecked(paths: string[]): string {
  if (paths.length === 0) return 'nothing changed since main.';

  const listed = paths.slice(0, LISTED_PATHS).join(', ');
  const more = paths.length > LISTED_PATHS ? ', ...' : '';

  return `nothing checked. None of the changed paths (${listed}${more}) is a file verify reads (JavaScript, TypeScript, JSON, CSS, YAML), so no format, lint, type or test check ran. This is not a pass.`;
}
