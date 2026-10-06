import path from 'node:path';
import { z } from 'zod';
import {
  initialMappingState,
  toAgentEvents,
} from '../../../packages/agents/claude/to-agent-events.ts';
import { recordedFeedEvents } from '../feed.ts';
import { recordedImage } from '../image.ts';
import { findRecording, readRecording } from '../recording.ts';

const Frame = z.looseObject({ type: z.string() });
const Payload = z.union([z.array(Frame), z.object({ output: z.array(Frame) })]);

export function feedEvents(name: string) {
  const file = findRecording(
    path.join(import.meta.dirname, 'recordings'),
    name,
  );
  const payload = Payload.parse(readRecording(file, 'claude-cli').payload);
  const frames = Array.isArray(payload) ? payload : payload.output;
  return recordedFeedEvents(
    { initialMappingState, toAgentEvents },
    frames
      .filter((frame) => !frame.type.startsWith('control_'))
      .map((frame) => ({
        ...frame,
        receivedAt: frame.emittedAtMs,
      })) as Parameters<typeof toAgentEvents>[0][],
  );
}

const PromptBlock = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({
    type: z.literal('image'),
    source: z.object({ media_type: z.string(), data: z.string() }),
  }),
]);
const UserFrame = z.object({
  type: z.literal('user'),
  message: z.object({
    content: z.union([z.string(), z.array(PromptBlock)]),
  }),
});
const InputPayload = z.object({ input: z.array(z.unknown()) });

// The first prompt the recording's input pipe holds, or undefined without one.
export function recordedPrompt(name: string) {
  const file = findRecording(
    path.join(import.meta.dirname, 'recordings'),
    name,
  );
  const payload = InputPayload.safeParse(
    readRecording(file, 'claude-cli').payload,
  );
  const frame = payload.data?.input
    .map((input) => UserFrame.safeParse(input).data)
    .find((user) => user !== undefined);
  if (!frame) return undefined;
  const { content } = frame.message;
  if (typeof content === 'string')
    return [{ type: 'text' as const, text: content }];
  return content.map((block) =>
    block.type === 'text'
      ? block
      : recordedImage(block.source.media_type, block.source.data),
  );
}
