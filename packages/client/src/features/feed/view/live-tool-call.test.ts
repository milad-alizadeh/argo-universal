import type { LiveHeader, SessionSnapshot } from '@repo/contracts';
import { recordedFeedMocks } from '@repo/mocks/app';
import { describe, expect, it } from 'vitest';
import { findLiveToolCall } from './live-tool-call';

// Two updates of one recorded Tool call, the latest last.
const recordings = recordedFeedMocks
  .filter((mock) => mock.recording === 'edit-and-command')
  .map((mock) => {
    const tool = mock.rows.find(
      (row) => row.sessionUpdate === 'tool_call_update',
    );
    if (tool?.sessionUpdate !== 'tool_call_update')
      throw new Error('Recorded catalog needs a Tool call for each Agent');
    return {
      agent: mock.agent,
      snapshot: mock.snapshot,
      toolCallId: tool.toolCallId,
      rows: [
        { ...tool, id: 'older-tool', title: 'Older Tool', position: 1 },
        { ...tool, id: 'latest-tool', title: 'Latest Tool', position: 2 },
      ],
    };
  });

const withSource = (
  snapshot: SessionSnapshot,
  source: LiveHeader['source'],
): SessionSnapshot => ({
  ...snapshot,
  liveHeader: { text: 'Working on the Session', startedAt: null, source },
});

describe('findLiveToolCall', () => {
  it.each(recordings)(
    'names the latest row of the live Tool call for $agent',
    ({ rows, snapshot, toolCallId }) => {
      const live = withSource(snapshot, { type: 'tool_call', toolCallId });
      expect(findLiveToolCall(rows, live)?.title).toBe('Latest Tool');
    },
  );

  it.each(recordings)(
    'gives none when the live Tool call is not held for $agent',
    ({ rows, snapshot }) => {
      const live = withSource(snapshot, {
        type: 'tool_call',
        toolCallId: 'missing',
      });
      expect(findLiveToolCall(rows, live)).toBeUndefined();
    },
  );

  it.each(recordings)(
    'gives none when the live header does not come from a Tool call for $agent',
    ({ rows, snapshot }) => {
      const live = withSource(snapshot, { type: 'working' });
      expect(findLiveToolCall(rows, live)).toBeUndefined();
    },
  );

  it('gives none before the snapshot arrives', () => {
    const [recording] = recordings;
    if (!recording) throw new Error('No recording');
    expect(findLiveToolCall(recording.rows, null)).toBeUndefined();
  });
});
