import path from 'node:path';
import { z } from 'zod';
import type { VendorMessage } from '../../../packages/agents/codex/messages.ts';
import {
  initialMappingState,
  toAgentEvents,
} from '../../../packages/agents/codex/to-agent-events.ts';
import { recordedFeedEvents } from '../feed.ts';
import { recordedDataUrlImage } from '../image.ts';
import { findRecording, readRecording } from '../recording.ts';

const Payload = z.object({
  messages: z.array(z.looseObject({ method: z.string() })),
});

export function feedEvents(name: string) {
  const file = findRecording(
    path.join(import.meta.dirname, 'recordings'),
    name,
  );
  const { messages } = Payload.parse(
    readRecording(file, 'codex-app-server').payload,
  );
  return recordedFeedEvents(
    { initialMappingState, toAgentEvents },
    messages.map((message) => ({
      ...message,
      receivedAt: message.emittedAtMs,
    })) as VendorMessage[],
  );
}

const UserMessageItem = z.object({
  method: z.literal('item/completed'),
  params: z.object({
    item: z.object({
      type: z.literal('userMessage'),
      content: z.array(
        z.discriminatedUnion('type', [
          z.object({ type: z.literal('text'), text: z.string() }),
          z.object({ type: z.literal('image'), url: z.string() }),
        ]),
      ),
    }),
  }),
});

// The first prompt the recording's Turns hold, or undefined without one.
export function recordedPrompt(name: string) {
  const file = findRecording(
    path.join(import.meta.dirname, 'recordings'),
    name,
  );
  const { messages } = Payload.parse(
    readRecording(file, 'codex-app-server').payload,
  );
  const item = messages
    .map((message) => UserMessageItem.safeParse(message).data)
    .find((message) => message !== undefined)?.params.item;
  return item?.content.map((block) =>
    block.type === 'text'
      ? { type: 'text' as const, text: block.text }
      : recordedDataUrlImage(block.url),
  );
}
