import {
  ReplaceableInput,
  messageSlotId,
  toolCallSlotId,
} from '../src/plugins/replaceable-input';
import type { WireNode } from '../src/plugins/wire';

const envelope = {
  id: '00000000-0000-4000-8000-000000000823',
  sessionId: '00000000-0000-4000-8000-000000000001',
  position: 1,
  revision: 1,
  turnId: null,
  state: 'settled',
};

export const messageSlotFixture = ReplaceableInput.parse({
  slotId: messageSlotId,
  props: {
    row: {
      ...envelope,
      sessionUpdate: 'agent_message',
      messageId: 'message',
      content: [{ type: 'text', text: 'Core message' }],
    },
  },
});

export const toolCallSlotFixture = ReplaceableInput.parse({
  slotId: toolCallSlotId,
  props: {
    row: {
      ...envelope,
      sessionUpdate: 'tool_call_update',
      toolCallId: 'tool',
      title: 'Core Tool call',
      kind: 'read',
      status: 'completed',
      content: [],
    },
  },
});

export const replacementTreeFixture: WireNode = {
  type: 'Text',
  key: '0',
  props: { children: 'Plugin replacement' },
  children: [],
  slots: {},
};

export const refusedTreeFixture: WireNode = {
  type: 'Stack',
  key: '0',
  props: { direction: 'column' },
  children: [
    replacementTreeFixture,
    { type: 'FuturePart', key: '1', props: {}, children: [], slots: {} },
  ],
  slots: {},
};

export const renderThrowReason = 'fixture drawing failed';

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
