import type { AgentMessage as AgentMessageRow } from '@repo/contracts';
import { memo } from 'react';
import { FeedContent } from '../feed-content/feed-content';

export interface AgentMessageProps {
  row: AgentMessageRow;
  // The Agent is writing into this message now, so it draws the caret.
  streaming?: boolean;
}

// An Agent message in full, as markdown on the Feed with no bubble.
export const AgentMessage = memo(function AgentMessage({
  row,
  streaming = false,
}: AgentMessageProps) {
  return <FeedContent content={row.content} streaming={streaming} />;
});
