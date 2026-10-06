import path from 'node:path';
import { z } from 'zod';
import {
  initialMappingState,
  toAgentEvents,
} from '../../../packages/agents/claude/to-agent-events.ts';
import { recordedFeedEvents } from '../feed.ts';
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
