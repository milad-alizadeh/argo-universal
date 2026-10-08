import path from 'node:path';
import type {
  SDKControlResponse,
  SDKUserMessage,
  VendorMessage,
} from '../../../packages/agents/claude/messages.ts';
import {
  initialMappingState,
  toAgentEvents,
} from '../../../packages/agents/claude/to-agent-events.ts';
import { recordedFeedEvents } from '../feed.ts';
import { recordedImage } from '../image.ts';
import { findRecording, readRecording, recordedFrames } from '../recording.ts';

export function feedEvents(name: string): import('@repo/agents').AgentEvent[] {
  const file = findRecording(
    path.join(import.meta.dirname, 'recordings'),
    name,
  );
  const frames = recordedFrames<
    (VendorMessage | SDKControlResponse) & { emittedAtMs?: number }
  >(readRecording(file, 'claude-cli').payload, 'output');
  return recordedFeedEvents(
    { initialMappingState, toAgentEvents },
    frames
      .filter(
        (frame): boolean =>
          !frame.type.startsWith('control_') ||
          frame.type === 'control_request',
      )
      .map((frame): typeof frame & { receivedAt: number | undefined } => ({
        ...frame,
        receivedAt: frame.emittedAtMs,
      })) as VendorMessage[],
  );
}

// The first prompt the recording's input pipe holds, or undefined without one.
export function recordedPrompt(
  name: string,
):
  | import('../../../packages/agents/src/agent-adapter').AgentCommandOf<'agent.prompt'>['content']
  | undefined {
  const file = findRecording(
    path.join(import.meta.dirname, 'recordings'),
    name,
  );
  const frame = recordedFrames<SDKUserMessage>(
    readRecording(file, 'claude-cli').payload,
    'input',
  ).find((input): boolean => input.type === 'user');
  if (!frame) return;
  const { content } = frame.message;
  if (typeof content === 'string')
    return [{ type: 'text' as const, text: content }];
  return content.flatMap(
    (block): NonNullable<ReturnType<typeof recordedPrompt>> => {
      if (block.type === 'text')
        return [{ type: 'text' as const, text: block.text }];
      if (block.type === 'image' && block.source.type === 'base64')
        return [recordedImage(block.source.media_type, block.source.data)];
      throw new Error(`Unsupported recorded prompt block: ${block.type}`);
    },
  );
}
