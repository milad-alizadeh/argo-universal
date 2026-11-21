import { Action, ContextActions } from '@repo/kit/primitives/actions/action';
import { showToast } from '@repo/kit/primitives/overlays/toast';
import { setStringAsync } from 'expo-clipboard';
import type * as React from 'react';
import { View } from 'react-native';
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
  row: Exclude<
    StandardRow,
    { sessionUpdate: 'user_message' | 'agent_message' }
  >,
): React.JSX.Element | null {
  return row.sessionUpdate === 'notice' ||
    row.sessionUpdate === 'compaction_update' ? (
    <FeedNotice row={row} />
  ) : null;
}

// A row the Feed draws itself, with no slot a Plugin can replace: a Prompt, and what was said on a Conversation. `partial` marks words still being said.
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
  const message = isOwnRow(row)
    ? renderOwnRow(row, drawing, partial)
    : renderStandardRow(row, drawing);

  if (!message) return null;

  // ACP reports no exact message-cutoff Fork or Rewind capability.
  if (
    row.sessionUpdate !== 'agent_message' &&
    row.sessionUpdate !== 'prompt_message' &&
    row.sessionUpdate !== 'user_message'
  )
    return message;

  const text = row.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('');

  return (
    <ContextActions
      actions={
        <Action
          icon="copy"
          label="Copy"
          onPress={() => void copyMessage(text)}
        />
      }
    >
      <View tabIndex={0}>{message}</View>
    </ContextActions>
  );
}

async function copyMessage(text: string): Promise<void> {
  const copied = await setStringAsync(text).catch(() => false);

  if (!copied) showToast({ title: 'Could not copy message', tone: 'danger' });
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
