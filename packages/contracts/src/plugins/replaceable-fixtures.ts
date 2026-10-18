import {
  ReplaceableInput,
  composerAboveSlotId,
  messageSlotId,
  toolCallSlotId,
} from './replaceable-input';
import type { WireNode } from './wire';

export const traySlotFixture: ReplaceableInput = {
  slotId: composerAboveSlotId,
  props: { wide: true, inactive: false },
};

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
  type: 'Column',
  key: '0',
  props: {},
  children: [{ ...replacementTreeFixture, type: 'FuturePart' }],
  slots: {},
};

export const renderThrowReason = 'fixture drawing failed';

export const rewrittenTrayFixture = ReplaceableInput.parse({
  slotId: composerAboveSlotId,
  props: { wide: true, inactive: true },
});
