import type { FeedSubscribeOutput } from '@repo/contracts';
import { newSessionCatalogs, recordedFeedMocks } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { createFeedMocks } from '../../../mocks/feed-mock';
import { createSubscriptionPublisher } from '../../../mocks/subscription-publisher';
import { useSessionFeed } from './use-session-feed';

type Result = ReturnType<typeof useSessionFeed>;

function FeedProbe({
  observe,
}: {
  observe: (result: Result) => void;
}): React.JSX.Element {
  const result = useSessionFeed('session-1');
  useEffect(() => observe(result), [observe, result]);
  return <Text>{result.liveToolCall?.title ?? 'No live Tool'}</Text>;
}

const meta = {
  title: 'Tests/SessionFeed',
  component: FeedProbe,
} satisfies Meta<typeof FeedProbe>;
export default meta;
type Story = StoryObj<typeof meta>;

const catalogs = newSessionCatalogs.bothAvailable.map((agent, index) => {
  const recorded = recordedFeedMocks.find(
    (mock) =>
      mock.agent === `agent-${index + 1}` &&
      mock.recording === 'edit-and-command',
  );
  const tool = recorded?.rows.find(
    (row) => row.sessionUpdate === 'tool_call_update',
  );
  if (!recorded || !tool)
    throw new Error('Recorded catalog needs a Tool call for each Agent');
  const rows = [
    { ...tool, id: 'older-tool', title: 'Older Tool', position: 1 },
    { ...tool, id: 'latest-tool', title: 'Latest Tool', position: 2 },
  ];
  return {
    ...recorded,
    rows,
    snapshot: {
      ...recorded.snapshot,
      agent: agent.agent,
      state: 'running' as const,
      activeTurnId: tool.turnId,
      liveHeader: {
        text: 'Working on the Session',
        startedAt: null,
        source: { type: 'tool_call' as const, toolCallId: tool.toolCallId },
      },
    },
  };
});

function feedStory(
  index: number,
  check: (
    result: () => Result,
    publish: (event: FeedSubscribeOutput) => void,
    catalog: (typeof catalogs)[number],
  ) => Promise<void>,
): Story {
  const catalog = catalogs[index];
  if (!catalog) throw new Error('Recorded catalog needs both Agents');
  const publisher = createSubscriptionPublisher<FeedSubscribeOutput>();
  let latest: Result | undefined;
  const observe = (result: Result): void => {
    latest = result;
  };
  const result = (): Result => {
    if (!latest) throw new Error('Session Feed has not rendered');
    return latest;
  };
  return {
    args: { observe },
    parameters: {
      trpc: {
        ...createFeedMocks(catalog),
        'feed.subscribe': async function* (
          _input: object,
          signal: AbortSignal,
        ) {
          yield { type: 'snapshot', snapshot: catalog.snapshot };
          yield* publisher.subscribe(signal);
        },
      },
    },
    beforeEach: () => {
      latest = undefined;
      publisher.reset();
    },
    play: async () => {
      await waitFor(() => expect(result().ready).toBe(true));
      await check(result, publisher.publish, catalog);
    },
  };
}

const latestTool = (index: number): Story =>
  feedStory(index, async (result) => {
    await expect(result().liveToolCall?.title).toBe('Latest Tool');
  });
const missingTool = (index: number): Story =>
  feedStory(index, async (result, publish, catalog) => {
    publish({
      type: 'snapshot',
      snapshot: {
        ...catalog.snapshot,
        liveHeader: {
          ...catalog.snapshot.liveHeader,
          source: { type: 'tool_call', toolCallId: 'missing' },
        },
      },
    });
    await waitFor(() => expect(result().liveToolCall).toBeUndefined());
  });
const nonTool = (index: number): Story =>
  feedStory(index, async (result, publish, catalog) => {
    publish({
      type: 'snapshot',
      snapshot: {
        ...catalog.snapshot,
        liveHeader: {
          ...catalog.snapshot.liveHeader,
          source: { type: 'working' },
        },
      },
    });
    await waitFor(() => expect(result().liveToolCall).toBeUndefined());
  });
const overlap = (index: number): Story =>
  feedStory(index, async (result, publish, catalog) => {
    const before = result();
    const previous = before.view;
    const row = catalog.rows[0];
    if (!row) throw new Error('Recorded catalog needs a row');
    publish({ type: 'row.upsert', row, rev: row.revision });
    await waitFor(() => expect(result()).not.toBe(before));
    await expect(result().view).toBe(previous);
  });
const snapshotUpdate = (index: number): Story =>
  feedStory(index, async (result, publish, catalog) => {
    const previous = result().view;
    if (!previous) throw new Error('Session Feed needs a derived view');
    publish({
      type: 'snapshot',
      snapshot: { ...catalog.snapshot, title: 'Changed title' },
    });
    await waitFor(() => expect(result().snapshot?.title).toBe('Changed title'));
    const next = result().view;
    if (!next) throw new Error('Session Feed needs a derived view');
    await expect(next.items).toHaveLength(previous.items.length);
    for (const [position, item] of next.items.entries())
      await expect(item).toBe(previous.items[position]);
  });

export const LatestToolFirstAgent = latestTool(0);
export const LatestToolSecondAgent = latestTool(1);
export const MissingToolFirstAgent = missingTool(0);
export const MissingToolSecondAgent = missingTool(1);
export const NonToolFirstAgent = nonTool(0);
export const NonToolSecondAgent = nonTool(1);
export const OverlapFirstAgent = overlap(0);
export const OverlapSecondAgent = overlap(1);
export const SnapshotUpdateFirstAgent = snapshotUpdate(0);
export const SnapshotUpdateSecondAgent = snapshotUpdate(1);
