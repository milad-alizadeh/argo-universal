import path from 'node:path';
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
    messages.map(
      (message): typeof message & { receivedAt: number | undefined } => ({
        ...message,
        receivedAt: message.emittedAtMs,
      }),
    ),
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
