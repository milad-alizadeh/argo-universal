import type { LiveHeader, SessionUpdate } from '@repo/contracts';
import { recordedAcpContent } from '../../../../lib/product/acp-feed-content.mocks';
import { toFeedView } from '../../view/to-feed-view';
import type { FeedProps } from '../feed/feed';
import { startedAt } from '../recorded-tool-calls.mocks';
import { commandNow, runningCommand } from '../tool-call.mocks';
import { markdownPrompt } from '../user-message/user-message-fixtures';

const { snapshot } = recordedAcpContent('agent-1');

// What the person said on a Conversation while the command ran; its Prompt steers the running Turn, so their words land below the command.
const spokenWords: SessionUpdate = {
  ...markdownPrompt.row,
  turnId: runningCommand.turnId,
  position: runningCommand.position + 1,
  content: [{ type: 'text', text: 'Also update the notes' }],
};

const runningHeader: LiveHeader = {
  text: runningCommand.title,
  source: { type: 'tool_call', toolCallId: runningCommand.toolCallId },
  startedAt: startedAt(runningCommand),
};

export const conversationPromptDuringToolCall = {
  items: toFeedView([runningCommand, spokenWords], snapshot).items,
  liveHeader: runningHeader,
  liveToolCall: runningCommand,
  now: commandNow,
} satisfies Partial<FeedProps>;
