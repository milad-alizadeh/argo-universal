import { renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import {
  secondFileName,
  editTurn,
  mainCheckoutSession,
  twoFileSession,
} from './session-changes.test.mocks';

it('publishes default Checkout totals after a settled edit without an existing subscriber', async () => {
  const turn = await editTurn();

  writeFileSync(join(turn.checkout, 'first.txt'), 'first\n');
  turn.releaseEdit();
  await turn.editSettled;

  expect(
    (
      await waitForAcpSnapshot(
        turn.host,
        turn.sessionId,
        (snapshot) => snapshot.changes.files === 1,
      )
    ).changes,
  ).toEqual({
    files: 1,
    additions: 1,
    deletions: 0,
  });
}, 15_000);

it('refreshes default Checkout totals when a Turn ends', async () => {
  const turn = await editTurn();

  writeFileSync(join(turn.checkout, 'first.txt'), 'first\n');
  turn.releaseEdit();
  await turn.editSettled;
  await waitForAcpSnapshot(
    turn.host,
    turn.sessionId,
    (snapshot) => snapshot.changes.files === 1,
  );
  writeFileSync(join(turn.checkout, secondFileName), 'second\n');
  turn.releaseTurn();

  expect(
    (
      await waitForAcpSnapshot(
        turn.host,
        turn.sessionId,
        (snapshot) => snapshot.state === 'idle' && snapshot.changes.files === 2,
      )
    ).changes,
  ).toEqual({
    files: 2,
    additions: 2,
    deletions: 0,
  });
}, 15_000);

it('keeps the last Checkout totals when a refresh fails', async () => {
  const turn = await editTurn();

  writeFileSync(join(turn.checkout, 'first.txt'), 'first\n');
  turn.releaseEdit();
  await turn.editSettled;
  await waitForAcpSnapshot(
    turn.host,
    turn.sessionId,
    (snapshot) => snapshot.changes.files === 1,
  );
  renameSync(join(turn.checkout, '.git'), join(turn.checkout, '.git-disabled'));
  turn.releaseTurn();

  expect(
    (
      await waitForAcpSnapshot(
        turn.host,
        turn.sessionId,
        (snapshot) => snapshot.state === 'idle',
      )
    ).changes,
  ).toEqual({
    files: 1,
    additions: 1,
    deletions: 0,
  });
}, 15_000);

it('returns changed files on the main Checkout', async () => {
  const { host, sessionId } = await mainCheckoutSession();

  expect(await host.caller.session.changes({ sessionId })).toEqual({
    mainBranch: 'main',
    summary: { files: 1, additions: 1, deletions: 0 },
    files: [
      { operation: 'add', path: 'first.txt', additions: 1, deletions: 0 },
    ],
    nextCursor: null,
  });
});

it('pages the changed files and keeps the whole comparison in the summary', async () => {
  const { host, sessionId } = await twoFileSession();

  expect(
    await host.caller.session.changes({ sessionId, limit: 1 }),
  ).toMatchObject({
    summary: { files: 2, additions: 2, deletions: 0 },
    files: [{ path: 'first.txt' }],
    nextCursor: 1,
  });
});
