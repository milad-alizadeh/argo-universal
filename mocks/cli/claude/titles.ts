import path from 'node:path';
import { z } from 'zod';
import { findRecording, readRecording } from '../recording.ts';

// The generated title saved by the real CLI after generate_session_title with persist enabled.
export function recordedTitle() {
  const file = findRecording(
    path.join(import.meta.dirname, 'recordings'),
    'session-title',
  );
  const payload = z
    .object({ transcript: z.array(z.unknown()) })
    .parse(readRecording(file, 'claude-cli').payload);
  const titleRecord = z.object({
    type: z.literal('ai-title'),
    aiTitle: z.string(),
  });
  const title = payload.transcript
    .map((record) => titleRecord.safeParse(record).data)
    .find((record) => record !== undefined);
  if (!title) throw new Error('Missing recorded Agent title');
  return title.aiTitle;
}
