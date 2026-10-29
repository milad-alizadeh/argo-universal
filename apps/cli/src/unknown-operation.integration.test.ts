import { expect, it } from 'vitest';
import { runCli } from '../mocks/cli-process';
import { startCliHost } from '../mocks/operations-cli';

it('exits with usage code 2 for an Operation the Server does not know', async () => {
  const host = await startCliHost();

  const result = await runCli(host.home, ['run', 'nope.thing']);

  expect(result).toMatchObject({ code: 2, stdout: '' });
}, 30_000);

it('passes an id it does not know to the Server, which names it', async () => {
  const host = await startCliHost();

  const result = await runCli(host.home, ['run', 'nope.thing']);

  expect(result.stderr).toContain('Unknown Operation nope.thing');
}, 30_000);
