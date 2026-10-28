import { OperationExecution } from '@repo/contracts/operations';
import { startPermissionWaitHost } from '@repo/engine/mocks/operation-waits';
import { expect, it } from 'vitest';
import { runCli } from '../mocks/cli-process';
import { startMalformedControlHost } from '../mocks/malformed-control';
import { startCliHost } from '../mocks/operations-cli';

it('waits for a short Operation and exits with its validated result', async () => {
  const host = await startCliHost();
  const result = await runCli(host.home, ['run', 'project.list', '--wait']);

  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual(await host.caller.project.list());
}, 30_000);

it('returns exit75 without --wait, caps a resumed wait with exit75, and reports refusal with exit1', async () => {
  const host = await startPermissionWaitHost();
  const run = await runCli(
    host.home,
    ['run', 'session.archive', '--params', JSON.stringify(host.target)],
    host.token,
  );
  expect(run.code).toBe(75);
  const pending = OperationExecution.parse(JSON.parse(run.stdout));
  const waiting = runCli(host.home, ['wait', pending.id], host.token);
  await host.waitStarted();
  host.advance(90_000);
  const capped = await waiting;
  expect(capped.code).toBe(75);
  expect(JSON.parse(capped.stdout)).toMatchObject({
    id: pending.id,
    status: 'waiting_for_user',
  });
  await host.answer('reject_once');
  const refused = await runCli(host.home, ['wait', pending.id], host.token);
  expect(refused).toMatchObject({
    code: 1,
    stdout: '',
    stderr: expect.stringContaining('The user refused'),
  });
}, 30_000);

it('refuses a malformed native wait result instead of reporting exit75', async () => {
  const id = `call:WyJ1c2VyIiwiYSIsImIiXQ:${'0'.repeat(64)}`;
  const home = await startMalformedControlHost({
    kind: 'operation_execution',
    id,
    status: 'unknown',
  });
  const result = await runCli(home, ['wait', id]);
  expect(result).toMatchObject({
    code: 1,
    stdout: '',
    stderr: expect.stringContaining('unrecognised Operation response'),
  });
}, 30_000);

it('caps run --wait at ninety seconds with exit75, then waits on the same native id with exit0', async () => {
  const host = await startPermissionWaitHost();
  let exited = false;
  const running = runCli(
    host.home,
    [
      'run',
      'session.archive',
      '--params',
      JSON.stringify(host.target),
      '--wait',
    ],
    host.token,
  ).then((result) => {
    exited = true;
    return result;
  });
  await host.permission();
  host.advance(89_999);
  await Promise.resolve();
  expect(exited).toBe(false);
  host.advance(1);
  const capped = await running;
  expect(capped.code).toBe(75);
  const pending = OperationExecution.parse(JSON.parse(capped.stdout));
  expect(pending.status).toBe('waiting_for_user');
  await host.answer('allow_once');
  const settled = await runCli(host.home, ['wait', pending.id], host.token);
  expect(settled.code).toBe(0);
  expect(JSON.parse(settled.stdout)).toMatchObject({
    id: pending.id,
    status: 'settled',
    result: {},
  });
}, 30_000);
