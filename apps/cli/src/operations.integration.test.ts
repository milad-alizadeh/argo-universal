import { readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { runCli } from '../mocks/cli-process';
import { startMalformedControlHost } from '../mocks/malformed-control';
import { startCliHost } from '../mocks/operations-cli';

const projectListId = 'project.list';

it('discovers Operations and their schemas from a terminal outside the repository', async () => {
  const host = await startCliHost();

  const result = await runCli(host.home, ['operations', 'FOLDERS', '--json']);

  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject([
    {
      id: projectListId,
      label: 'List Projects',
      description: expect.any(String),
      tier: 'read',
      params: { type: 'object' },
      result: { type: 'array' },
      enabled: true,
      disabledReason: null,
    },
  ]);
}, 30_000);

it('runs project.list with the same result as the App', async () => {
  const host = await startCliHost();

  const result = await runCli(host.home, [
    'run',
    projectListId,
    '--params',
    '{}',
  ]);

  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual(await host.caller.project.list());
}, 30_000);

it('names the invalid Operation argument and exits with usage code 2', async () => {
  const host = await startCliHost();

  const result = await runCli(host.home, [
    'run',
    projectListId,
    '--params',
    '{"projectId":42}',
  ]);

  expect(result).toMatchObject({
    code: 2,
    stdout: '',
    stderr: expect.stringContaining('projectId'),
  });
}, 30_000);

it.each(['', 'wrong-token'])(
  'refuses an explicitly supplied invalid token %j without falling back',
  async (token) => {
    const host = await startCliHost();

    const result = await runCli(host.home, ['operations', '--json'], token);

    expect(result).toMatchObject({
      code: 1,
      stdout: '',
      stderr: expect.stringContaining('An Argo token is required'),
    });
  },
  30_000,
);

it.each([
  ['run', projectListId, '--params', '{'],
  ['run'],
  ['run', projectListId, '--unknown'],
  ['operations', 'first', 'second'],
  ['wait', 'not-yet-supported'],
])(
  'rejects invalid CLI usage %j with exit code 2',
  async (...args) => {
    const result = await runCli('/nonexistent-argo-cli-home', args);

    expect(result.code).toBe(2);
  },
  30_000,
);

it('uses ARGO_TOKEN when the user token file is absent', async () => {
  const host = await startCliHost();
  const tokenPath = join(host.home, 'control.token');
  const token = await readFile(tokenPath, 'utf8');
  await unlink(tokenPath);
  const result = await runCli(host.home, ['run', projectListId], token);

  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual(await host.caller.project.list());
}, 30_000);

it('rejects and counts a malformed Server discovery response', async () => {
  const home = await startMalformedControlHost();
  const result = await runCli(home, ['operations', '--json']);

  expect(result).toMatchObject({
    code: 1,
    stdout: '',
    stderr: expect.stringContaining('unrecognised Operation response #1'),
  });
}, 30_000);
