import path from 'node:path';
import type { VendorMessage } from '../../../packages/agents/codex/messages.ts';
import {
  initialMappingState,
  toAgentEvents,
} from '../../../packages/agents/codex/to-agent-events.ts';
import { recordedFeedEvents } from '../feed.ts';
import { recordedDataUrlImage } from '../image.ts';
import { findRecording, readRecording, recordedFrames } from '../recording.ts';

export function feedEvents(name: string) {
  const file = findRecording(
    path.join(import.meta.dirname, 'recordings'),
    name,
  );
  const messages = recordedFrames<VendorMessage & { emittedAtMs?: number }>(
    readRecording(file, 'codex-app-server').payload,
    'messages',
  );
  return recordedFeedEvents(
    { initialMappingState, toAgentEvents },
    messages.map((message) => ({
      ...message,
      receivedAt: message.emittedAtMs,
    })) as VendorMessage[],
  );
}

// The first prompt the recording's Turns hold, or undefined without one.
export function recordedPrompt(name: string) {
  const file = findRecording(
    path.join(import.meta.dirname, 'recordings'),
    name,
  );
  const messages = recordedFrames<VendorMessage & { emittedAtMs?: number }>(
    readRecording(file, 'codex-app-server').payload,
    'messages',
  );
  const completed = messages.find(
    (message) =>
      message.method === 'item/completed' &&
      message.params.item.type === 'userMessage',
  );
  if (
    completed?.method !== 'item/completed' ||
    completed.params.item.type !== 'userMessage'
  )
    return undefined;
  return completed.params.item.content.flatMap((block) => {
    if (block.type === 'text')
      return [{ type: 'text' as const, text: block.text }];
    if (block.type === 'image' && 'url' in block)
      return [recordedDataUrlImage(block.url)];
    throw new Error(`Unsupported recorded prompt block: ${block.type}`);
  });
}
