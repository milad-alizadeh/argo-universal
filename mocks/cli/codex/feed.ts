import path from 'node:path';
import { z } from 'zod';
import type { VendorMessage } from '../../../packages/agents/codex/messages.ts';
import {
  initialMappingState,
  toAgentEvents,
} from '../../../packages/agents/codex/to-agent-events.ts';
import { recordedFeedEvents } from '../feed.ts';
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
