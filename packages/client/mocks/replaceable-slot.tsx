import {
  messageSlotId,
  type ReplaceableInput,
} from '@repo/contracts/plugins/replaceable';
import { messageSlotFixture } from '@repo/contracts/plugins/replaceable-fixtures';
import type { WireNode } from '@repo/contracts/plugins/wire';
import { FeedItem } from '../src/features/feed/components/feed-item';
import type { ReplaceableState } from '../src/lib/product/plugin-registry/replaceable-state';

export function renderCoreMessage(
  input: ReplaceableInput,
): React.JSX.Element | null {
  if (input.slotId !== messageSlotId) return null;

  return (
    <FeedItem
      item={{ type: 'row', row: input.props.row }}
      imageUrl={() => ''}
    />
  );
}

export function replacementState(root: WireNode): ReplaceableState {
  return {
    input: messageSlotFixture,
    replacement: {
      pluginId: 'fixture',
      path: 'render:fixture',
      view: { root, revision: 1, viewId: null },
    },
  };
}

export function rewrittenMessage(): ReplaceableInput {
  if (messageSlotFixture.slotId !== messageSlotId)
    throw new Error('Expected message fixture');

  return {
    ...messageSlotFixture,
    props: {
      row: {
        ...messageSlotFixture.props.row,
        content: [{ type: 'text', text: 'Rewritten message' }],
      },
    },
  };
}
