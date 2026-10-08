import path from 'node:path';
import type { VendorMessage } from '../../../packages/agents/codex/messages.ts';
import { isIgnoredMethod } from '../../../packages/agents/codex/notification-kinds.ts';
import { isVendorMessage } from '../../../packages/agents/codex/payloads.ts';
import {
  initialMappingState,
  toAgentEvents,
} from '../../../packages/agents/codex/to-agent-events.ts';
import { isWireMessage } from '../../../packages/agents/codex/wire-payloads.ts';
import { recordedFeedEvents } from '../feed.ts';
import { recordedDataUrlImage } from '../image.ts';
import { findRecording, readRecording, recordedFrames } from '../recording.ts';

export function feedEvents(name: string): import('@repo/agents').AgentEvent[] {
  const file = findRecording(
    path.join(import.meta.dirname, 'recordings'),
    name,
  );
  const messages = recordedFrames(
    readRecording(file, 'codex-app-server').payload,
    'messages',
    isWireMessage,
  );
  return recordedFeedEvents(
    { initialMappingState, toAgentEvents },
    messages.flatMap(decodeMessage),
  );
}

// The first prompt the recording's Turns hold, or undefined without one.
export function recordedPrompt(
  name: string,
):
  | import('../../../packages/agents/src/agent-adapter').AgentCommandOf<'agent.prompt'>['content']
  | undefined {
  const file = findRecording(
    path.join(import.meta.dirname, 'recordings'),
    name,
  );
  const messages = recordedFrames(
    readRecording(file, 'codex-app-server').payload,
    'messages',
    isWireMessage,
  );
  const completed = messages.find(
    (message): boolean =>
      isVendorMessage(message) &&
      message.method === 'item/completed' &&
      message.params.item.type === 'userMessage',
  );
  if (
    !isVendorMessage(completed) ||
    completed.method !== 'item/completed' ||
    completed.params.item.type !== 'userMessage'
  )
    return;
  return completed.params.item.content.flatMap(
    (block): NonNullable<ReturnType<typeof recordedPrompt>> => {
      if (block.type === 'text')
        return [{ type: 'text' as const, text: block.text }];
      if (block.type === 'image' && 'url' in block)
        return [recordedDataUrlImage(block.url)];
      throw new Error(`Unsupported recorded prompt block: ${block.type}`);
    },
  );
}

function decodeMessage(
  message: import('../../../packages/agents/codex/wire-payloads.ts').WireMessage,
): VendorMessage[] {
  if (isIgnoredMethod(message.method)) return [];
  const payload: unknown = message;
  if (!isVendorMessage(payload))
    throw new Error(`Invalid recorded payload: ${message.method}`);
  return [
    {
      ...payload,
      ...(message.emittedAtMs === undefined
        ? {}
        : { receivedAt: message.emittedAtMs }),
    },
  ];
}
