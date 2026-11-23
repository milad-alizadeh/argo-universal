import { execFile } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile);

export type TestGit = (...arguments_: string[]) => Promise<string>;

const identity = ['-c', 'user.name=Test', '-c', 'user.email=test@example.com'];

// Runs git in `directory`, returning its trimmed output.
export function gitIn(directory: string): TestGit {
  return async (...arguments_: string[]): Promise<string> =>
    (await execute('git', arguments_, { cwd: directory })).stdout.trim();
}

export async function commit(git: TestGit, message: string): Promise<void> {
  await git(...identity, 'commit', '-q', '--allow-empty', '-m', message);
}

async function addFeatureBranch(git: TestGit): Promise<void> {
  await git('switch', '-q', '-c', 'feature');
  await commit(git, 'Feature');
  await git('switch', '-q', 'main');
}

async function buildIn(
  directory: string,
  featureBranch: boolean,
): Promise<TestGit> {
  const git = gitIn(directory);

  await git('init', '-q', '--initial-branch=main');
  await commit(git, 'Initial');

  if (featureBranch) await addFeatureBranch(git);

  return git;
}

async function buildTemplate(featureBranch: boolean): Promise<string> {
  const directory = mkdtempSync(join(tmpdir(), 'argo-test-git-template-'));

  process.once('exit', () =>
    rmSync(directory, { recursive: true, force: true }),
  );

  await buildIn(directory, featureBranch);

  return directory;
}

// A test run builds both templates once and names their folder here, so a test file copies them instead of running git again.
export const prebuiltRepositoriesVariable = 'ARGO_PREBUILT_TEST_REPOSITORIES';

const templateFolder = (featureBranch: boolean): string =>
  featureBranch ? 'feature' : 'main';

// Builds the template of each shape inside `directory`, for a run's global setup to name in `prebuiltRepositoriesVariable`.
export async function buildTestRepositoryTemplates(
  directory: string,
): Promise<void> {
  await Promise.all(
    [false, true].map(async (featureBranch) => {
      const template = join(directory, templateFolder(featureBranch));

      mkdirSync(template, { recursive: true });
      await buildIn(template, featureBranch);
    }),
  );
}

const prebuiltTemplate = (featureBranch: boolean): Promise<string> | null => {
  const directory = process.env[prebuiltRepositoriesVariable];

  return directory
    ? Promise.resolve(join(directory, templateFolder(featureBranch)))
    : null;
};

// One template repository per test file and shape, unless the run built them; each test gets its own copy.
const templates = new Map<boolean, Promise<string>>();

function templateOf(featureBranch: boolean): Promise<string> {
  const built =
    templates.get(featureBranch) ??
    prebuiltTemplate(featureBranch) ??
    buildTemplate(featureBranch);

  templates.set(featureBranch, built);

  return built;
}

// A repository on `main` ("Initial"); with `featureBranch`, `feature` is one commit ("Feature") ahead.
export async function initTestRepository(
  directory: string,
  featureBranch = true,
): Promise<TestGit> {
  mkdirSync(directory, { recursive: true });

  // A repository already there, such as a seeded Project's, is built on in place: a copy cannot overwrite its read-only objects.
  if (existsSync(join(directory, '.git')))
    return buildIn(directory, featureBranch);

  const template = await templateOf(featureBranch);

  cpSync(join(template, '.git'), join(directory, '.git'), { recursive: true });

  return gitIn(directory);
}
