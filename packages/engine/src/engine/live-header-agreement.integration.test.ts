import type { FeedSubscribeOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { liveHeaderMocks } from '#mocks/live-header';
import {
  publishStoredHeader,
  startLiveHeaderHost,
  type LiveHeaderHost,
} from '#mocks/live-header-composition';

async function listActivity(
  context: LiveHeaderHost,
): Promise<string | undefined> {
  return (await context.caller.session.list({ archived: false })).sessions[0]
    ?.activity;
}

async function firstSnapshot(
  context: LiveHeaderHost,
): Promise<FeedSubscribeOutput | void> {
  const events = (
    await context.caller.feed.subscribe({ sessionId: 'session-1', after: null })
  )[Symbol.asyncIterator]();

  const { value } = await events.next();
  await events.return?.();

  return value;
}

it.each(
  liveHeaderMocks.flatMap(
    ({ agent, command, thought, retry, recordedHeader }) => [
      {
        agent,
        step: 'Tool call',
        row: { ...command, revision: 2 },
        expected: recordedHeader,
      },
      {
        agent,
        step: 'thought',
        row: { ...thought, revision: 2 },
        expected: 'Checking the tests',
      },
      {
        agent,
        step: 'retry',
        row: { ...retry, revision: 2 },
        expected: 'Retrying (2 of 5)',
      },
    ],
  ),
)(
  'gives the list and the snapshot the same Live header for a running root Session after a $step with $agent',
  async ({ agent, row, expected }): Promise<void> => {
    const context = await startLiveHeaderHost(agent);
    await publishStoredHeader(context, row);

    await expect.poll(() => listActivity(context)).toBe(expected);
    expect(await firstSnapshot(context)).toMatchObject({
      type: 'snapshot',
      snapshot: { liveHeader: { text: expected } },
    });
  },
);
