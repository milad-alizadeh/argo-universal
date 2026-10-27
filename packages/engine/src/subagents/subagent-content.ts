import type { ContentBlock } from '@repo/contracts';
import { mapSupportedContentBlock } from '../feed';
import type { AcpSessionMessage } from './subagent-actions';

function replaceContent(
  update: Extract<AcpSessionMessage, { sessionUpdate: 'session_message' }>,
  previous: ContentBlock[],
): ContentBlock[] {
  if (update.content === undefined) return previous;

  return (update.content ?? []).map(mapSupportedContentBlock);
}

export function messageContent(
  update: AcpSessionMessage,
  previous: ContentBlock[] = [],
): ContentBlock[] {
  if (update.sessionUpdate === 'session_message_chunk')
    return [...previous, mapSupportedContentBlock(update.content)];

  return replaceContent(update, previous);
}
