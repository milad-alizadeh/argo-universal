import { execFile } from 'node:child_process';
import { basename } from 'node:path';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';
import { registeredProject } from '#mocks/probe-plugin';
import { runProbe } from '#mocks/probe-run';

const git = promisify(execFile);

it('lets a Plugin list Project identities through the logged argo.projects API', async () => {
  const projectPath = await registeredProject();
  const originUrl = 'git@github.com:fixture/issue-tracker.git';

  await git('git', ['-C', projectPath, 'remote', 'add', 'origin', originUrl]);

  const result = await runProbe({
    calls: {
      projects: 'argo.projects.list().then((rows) => JSON.stringify(rows))',
    },
  });

  expectProjectList(result.results.projects, [
    { id: expect.any(String), name: basename(projectPath), originUrl },
  ]);
  expect(result.log).toContain('Plugin probe: argo.projects.list');
});

function expectProjectList(
  projects:
    | Awaited<ReturnType<typeof runProbe>>['results']['projects']
    | undefined,
  expected: { id: unknown; name: string; originUrl: string | null }[],
): void {
  if (!projects) throw new Error('Project list call returned no result');

  if (!('value' in projects)) throw new Error('Project list call failed');

  assertString(projects.value);

  expect(JSON.parse(projects.value)).toEqual(expected);
}

function assertString(value: unknown): asserts value is string {
  if (typeof value !== 'string')
    throw new Error('Project list returned a non-string value');
}
