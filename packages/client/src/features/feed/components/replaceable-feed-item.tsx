import type {
  AgentMessage as AgentMessageRow,
  BlobRef,
  ToolCallUpdate,
  UserMessage as UserMessageRow,
} from '@repo/contracts';
import {
  messageSlotId,
  toolCallSlotId,
} from '@repo/contracts/plugins/replaceable';
import { ReplaceableSlot } from '#lib/product/plugin-registry/replaceable-slot';
import { AgentMessage } from './agent-message/agent-message';
import { UserMessage } from './user-message/user-message';

export function renderToolCallSlot(
  row: ToolCallUpdate,
  draw: (row: ToolCallUpdate) => React.JSX.Element,
): React.JSX.Element {
  return (
    <ReplaceableSlot
      input={{ slotId: toolCallSlotId, props: { row } }}
      renderCore={(input) =>
        input.slotId === toolCallSlotId ? draw(input.props.row) : null
      }
    />
  );
}

export function renderMessageSlot(
  row: AgentMessageRow | UserMessageRow,
  imageUrl: (blob: BlobRef) => string,
): React.JSX.Element {
  return (
    <ReplaceableSlot
      input={{ slotId: messageSlotId, props: { row } }}
      renderCore={(input) =>
        input.slotId === messageSlotId
          ? drawMessage(input.props.row, imageUrl)
          : null
      }
    />
  );
}

function drawMessage(
  row: AgentMessageRow | UserMessageRow,
  imageUrl: (blob: BlobRef) => string,
): React.JSX.Element {
  return row.sessionUpdate === 'user_message' ? (
    <UserMessage row={row} imageUrl={imageUrl} />
  ) : (
    <AgentMessage row={row} />
  );
}
