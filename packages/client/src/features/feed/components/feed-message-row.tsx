import type * as React from 'react';
import type { FeedViewItem } from '../view/feed-view';
import type { FeedItemProps } from './feed-item';
import { FeedNotice } from './feed-notice/feed-notice';
import { renderMessageSlot } from './replaceable-feed-item';
import { VoiceTranscript } from './transcript/voice-transcript';
import { UserMessage } from './user-message/user-message';

type FeedRowItem = Extract<FeedViewItem, { type: 'row' }>['row'];

type Drawing = Omit<FeedItemProps, 'item'>;

type StandardRow = Exclude<
  FeedRowItem,
  {
    sessionUpdate: 'prompt_message' | 'person_transcript' | 'voice_transcript';
  }
>;

const ownKinds = new Set<string>([
  'prompt_message',
  'person_transcript',
  'voice_transcript',
]);

const isOwnRow = (row: FeedRowItem): row is Exclude<FeedRowItem, StandardRow> =>
  ownKinds.has(row.sessionUpdate);

function noticeRow(
  row: Exclude<StandardRow, { sessionUpdate: 'user_message' | 'agent_message' }>,
): React.JSX.Element | null {
  return row.sessionUpdate === 'notice' ||
    row.sessionUpdate === 'compaction_update' ? (
    <FeedNotice row={row} />
  ) : null;
}

// A row the Feed draws itself, with no slot a Plugin can replace: a Prompt, and what was said on a Voice call. `partial` marks words still being said.
function renderOwnRow(
  row: Exclude<FeedRowItem, StandardRow>,
  drawing: Drawing,
  partial: boolean,
): React.JSX.Element {
  if (row.sessionUpdate === 'voice_transcript')
    return <VoiceTranscript row={row} partial={partial} />;

  return (
    <UserMessage row={row} imageUrl={drawing.imageUrl} partial={partial} />
  );
}

export function renderRow(
  row: FeedRowItem,
  drawing: Drawing,
  partial = false,
): React.JSX.Element | null {
  return isOwnRow(row)
    ? renderOwnRow(row, drawing, partial)
    : renderStandardRow(row, drawing);
}

function renderStandardRow(
  row: StandardRow,
  drawing: Drawing,
): React.JSX.Element | null {
  if (
    row.sessionUpdate !== 'user_message' &&
    row.sessionUpdate !== 'agent_message'
  )
    return noticeRow(row);

  return renderMessageSlot(row, drawing);
}
