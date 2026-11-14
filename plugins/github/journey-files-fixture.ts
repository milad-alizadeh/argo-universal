import type { PluginTest } from '@argo/plugin-kit/testing';
import type { FixtureFile, GitHubFixture } from './github-fixture';
import { caller, type Caller, type Journey } from './journey-fixture';

type OperationAnswer = Awaited<ReturnType<PluginTest['operations']['run']>>;

// One changed file as GitHub lists it; a modified file with one line changed unless `changes` says otherwise.
export const fileOf = (
  filename: string,
  changes: Partial<FixtureFile> = {},
): FixtureFile => ({
  filename,
  status: 'modified',
  additions: 1,
  deletions: 1,
  patch: `@@ -1 +1 @@\n-old ${filename}\n+new ${filename}`,
  ...changes,
});

// What GitHub lists as the files of a pull request, by `owner/repository#number`.
export const setFiles = (
  github: GitHubFixture,
  key: string,
  files: FixtureFile[],
): void => void github.files.set(key, files);

type Asked = { reference: string; cursor?: number; path?: string; as?: Caller };

const paramsOf = ({
  reference,
  cursor,
  path,
}: Asked): Pick<Asked, 'reference' | 'cursor' | 'path'> => ({
  reference,
  ...(cursor !== undefined && { cursor }),
  ...(path !== undefined && { path }),
});

async function ask(
  { test }: Journey,
  name: 'files' | 'diff',
  asked: Asked,
): Promise<OperationAnswer> {
  return test.operations.run({
    name,
    params: paramsOf(asked),
    caller: asked.as ?? caller,
  });
}

// What the App's Files list asks the Plugin for: one page of a selected pull request's files.
export const filesOfPull = (
  run: Journey,
  asked: Omit<Asked, 'path'>,
): Promise<OperationAnswer> => ask(run, 'files', asked);

// What the App asks for when a file of the selected pull request is opened.
export const diffOfPull = (
  run: Journey,
  asked: Omit<Asked, 'cursor'> & { path: string },
): Promise<OperationAnswer> => ask(run, 'diff', asked);
