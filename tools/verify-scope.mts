import path from 'node:path';

// About 40 seconds of story tests at the local worker count; a primitive's edit reaches about 280 of 328 story files.
export const DEPENDENT_LIMIT = 40;

export interface ListedTest {
  file: string;
  projectName: string;
}

interface ScopeInput {
  listed: ListedTest[];
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
  listed,
  changed,
  root,
  limit = DEPENDENT_LIMIT,
}: ScopeInput): TestScope {
  const files = [...new Set(listed.map(({ file }): string => file))];

  if (files.length <= limit)
    return { files, dependents: files.length, narrowed: false };

  // A root file, such as the lockfile, sits in every folder, so it narrows to nothing.
  const folders = [
    ...new Set(changed.map((file) => path.dirname(file))),
  ].filter((folder): boolean => folder !== root);

  const near = files.filter((file): boolean =>
    folders.some((folder): boolean => isWithin(file, folder)),
  );

  return { files: near, dependents: files.length, narrowed: true };
}
