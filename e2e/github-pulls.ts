import { cp, writeFile } from 'node:fs/promises';
import path from 'node:path';

// The pull requests the fixture GitHub holds for a scenario tagged @github-pulls, all Open and in one repository.
export const repository = 'owner/app';

type Check = {
  name: string;
  status: 'in_progress' | 'completed';
  conclusion: string | null;
};

type FixtureFile = {
  filename: string;
  status: 'modified' | 'added';
  additions: number;
  deletions: number;
  patch: string;
};

export type FixturePullRequest = {
  repository: string;
  number: number;
  title: string;
  branch: string;
  head: string;
  base: string;
  additions: number;
  deletions: number;
  files: FixtureFile[];
  checks: Check[];
};

const passed = (name: string): Check => ({
  name,
  status: 'completed',
  conclusion: 'success',
});

const headOf = (digit: string): string => digit.repeat(40);

const patchOf = (name: string): string =>
  `@@ -1,2 +1,3 @@\n context of ${name}\n-removed in ${name}\n+added in ${name}\n+also added in ${name}`;

const fileOf = (name: string): FixtureFile => ({
  filename: name,
  status: 'modified',
  additions: 2,
  deletions: 1,
  patch: patchOf(name),
});

type Spec = Pick<FixturePullRequest, 'number' | 'title' | 'checks'> & {
  files: string[];
};

const pullRequestOf = ({
  number,
  title,
  files,
  checks,
}: Spec): FixturePullRequest => ({
  repository,
  number,
  title,
  branch: `feature-${number}`,
  head: headOf(String(number % 10)),
  base: 'main',
  additions: files.length * 2,
  deletions: files.length,
  files: files.map(fileOf),
  checks,
});

const specs: Spec[] = [
  {
    number: 11,
    title: 'Write the release notes',
    files: ['docs/release-notes.md'],
    checks: [passed('lint'), passed('build')],
  },
  {
    number: 12,
    title: 'Tidy the settings page',
    files: ['settings/page.ts', 'settings/page.test.ts'],
    checks: [passed('lint')],
  },
  {
    number: 13,
    title: 'Speed up the feed',
    files: ['feed/list.ts'],
    checks: [passed('lint')],
  },
  {
    number: 14,
    title: 'Show the files of a pull request',
    files: [
      'inspector/pull-request-files.ts',
      'inspector/pull-request-files.test.ts',
    ],
    checks: [
      passed('lint'),
      passed('build'),
      { name: 'unit tests', status: 'in_progress', conclusion: null },
    ],
  },
];

export const pullRequests = specs.map(pullRequestOf);

// What the fixture GitHub is started from, beside the Server.
export const writeGitHubFixture = (file: string): Promise<void> =>
  writeFile(file, JSON.stringify({ pulls: pullRequests }));

const here = import.meta.dirname;

const ignored = new Set(['node_modules']);

const isPluginSource = (source: string): boolean =>
  !ignored.has(path.basename(source)) &&
  !/\.test\.ts$|journey|-fixture|tsconfig|vitest\.config|\.gen\.d\.ts$/.test(
    path.basename(source),
  );

/*
 * The real GitHub Plugin, as the Server ships it, beside a fixture Plugin that provides the Account it borrows: the
 * Issue tracker's sign-in has nobody to drive in a scenario.
 */
export async function installGitHubPlugins(home: string): Promise<void> {
  const shipped = path.join(home, 'shipped-plugins');

  await cp(path.join(here, '../plugins/github'), path.join(shipped, 'github'), {
    recursive: true,
    filter: isPluginSource,
  });
  await cp(
    path.join(here, 'mocks/github-plugins/github-account'),
    path.join(shipped, 'github-account'),
    { recursive: true },
  );
}
