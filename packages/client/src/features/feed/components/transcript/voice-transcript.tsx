import type { VoiceTranscript as VoiceTranscriptRow } from '@repo/contracts';
import { memo } from 'react';
import { FeedContent } from '../feed-content/feed-content';
import { transcriptStyle } from './transcript-style';

export interface VoiceTranscriptProps {
  row: VoiceTranscriptRow;
  // The words are still being said, so they are drawn as a partial.
  partial?: boolean;
}

// What the voice said, as plain text on the Feed with no bubble.
export const VoiceTranscript = memo(function VoiceTranscript({
  row,
  partial = false,
}: VoiceTranscriptProps) {
  return (
    <FeedContent
      content={row.content}
      rowId={row.id}
      textVariant={transcriptStyle(partial).textVariant}
    />
  );
});
