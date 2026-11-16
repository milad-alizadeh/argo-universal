import { recordedFeedMock } from '../../../lib/product/feed-message.mocks';
import { toFeedView } from '../view/to-feed-view';
import type { FeedItemProps } from './feed-item';
import { required } from './recorded-tool-calls.mocks';
import {
  completedCommand,
  readMocks,
  recordedToolCall,
} from './tool-call.mocks';

const recording = recordedFeedMock('agent-1', 'edit-and-command');

// Recorded calls share one Turn so the converter groups both activity boundaries.
const rows = [
  recordedToolCall('mcp-content'),
  recordedToolCall('mcp-raw'),
  ...readMocks.map(({ row }) => row),
  completedCommand,
].map((row, position) => ({
  ...row,
  sessionId: completedCommand.sessionId,
  turnId: completedCommand.turnId,
  position,
}));

export const mixedTools = {
  item: required(
    toFeedView(rows, recording.snapshot).items.find(
      (item) => item.type === 'group',
    ),
    'a mixed Tool call group',
  ),
} satisfies Omit<FeedItemProps, 'imageUrl'>;
