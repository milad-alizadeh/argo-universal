import type { AgentMessage as AgentMessageRow } from '@repo/contracts';
import { memo } from 'react';
import { FeedContent } from './feed-content';

export interface AgentMessageProps {
  row: AgentMessageRow;
}

// An Agent message in full, as markdown on the Feed with no bubble.
export const AgentMessage = memo(function AgentMessage({
  row,
}: AgentMessageProps) {
  return <FeedContent content={row.content} streaming={row.state === 'open'} />;
});
