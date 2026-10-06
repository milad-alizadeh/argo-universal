import type { AgentMessage as AgentMessageRow } from '@repo/contracts';
import { memo } from 'react';
import { FeedMarkdown } from './FeedMarkdown';

export interface AgentMessageProps {
  row: AgentMessageRow;
}

// An Agent message in full, as markdown on the Feed with no bubble.
export const AgentMessage = memo(function AgentMessage({
  row,
}: AgentMessageProps) {
  const text = row.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('\n\n');
  return <FeedMarkdown text={text} streaming={row.state === 'open'} />;
});
