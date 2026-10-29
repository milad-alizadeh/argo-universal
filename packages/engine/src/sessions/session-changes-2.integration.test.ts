import { expect, it, onTestFinished } from 'vitest';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { startEngineTestHost } from '#mocks/engine';
import {
  secondFileName,
  mainCheckoutSession,
  twoFileSession,
  threeLineSession,
} from './session-changes.test.mocks';

// The next page is asked for as the client's infinite query asks, with its direction.
it('returns the next page of changed files from its cursor', async () => {
  const { host, sessionId } = await twoFileSession();

  expect(
    await host.caller.session.changes({
      sessionId,
      limit: 1,
      cursor: 1,
      direction: 'forward',
    }),
  ).toMatchObject({ files: [{ path: secondFileName }], nextCursor: null });
});

it('pages one file diff by its lines', async () => {
  const { host, sessionId } = await threeLineSession();

  expect(
    await host.caller.session.diff({ sessionId, path: 'first.txt', limit: 2 }),
  ).toMatchObject({
    nextCursor: 2,
    patch: { text: expect.not.stringContaining('+three') },
  });
});

it('numbers the next diff page from where the last one stopped', async () => {
  const { host, sessionId } = await threeLineSession();

  expect(
    await host.caller.session.diff({
      sessionId,
      path: 'first.txt',
      limit: 2,
      cursor: 2,
    }),
  ).toMatchObject({
    nextCursor: null,
    patch: { text: expect.stringContaining('@@ -0,0 +3,1 @@') },
  });
});

it('keeps Checkout totals in a stored Session snapshot after close', async () => {
  const { host, sessionId } = await mainCheckoutSession();

  await host.caller.session.close({ sessionId });

  expect(
    (
      await waitForAcpSnapshot(
        host,
        sessionId,
        (snapshot) => snapshot.changes.files === 1,
      )
    ).changes,
  ).toEqual({ files: 1, additions: 1, deletions: 0 });
});

it('recomputes stored Checkout totals after an Engine restart', async () => {
  const { host, sessionId } = await mainCheckoutSession();

  await host.stop();
  const restarted = await startEngineTestHost({ home: host.home });
  onTestFinished(() => restarted.stop());

  expect(
    (
      await waitForAcpSnapshot(
        restarted,
        sessionId,
        (snapshot) => snapshot.changes.files === 1,
      )
    ).changes,
  ).toEqual({ files: 1, additions: 1, deletions: 0 });
});

it('returns one changed file unified diff', async () => {
  const { host, sessionId } = await mainCheckoutSession();

  expect(
    await host.caller.session.diff({ sessionId, path: 'first.txt' }),
  ).toMatchObject({
    file: { path: 'first.txt' },
    patch: { format: 'git_patch', text: expect.stringContaining('+first') },
  });
});

it('rejects a diff path outside the changed file list', async () => {
  const { host, sessionId } = await mainCheckoutSession();

  await expect(
    host.caller.session.diff({ sessionId, path: '../other.txt' }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
});
