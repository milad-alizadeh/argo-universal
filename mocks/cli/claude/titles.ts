import path from 'node:path';
import type {
  SDKControlResponse,
  SDKMessage,
} from '../../../packages/agents/claude/messages.ts';
import { findRecording, readRecording, recordedFrames } from '../recording.ts';

// The real CLI's response to generate_session_title with persist enabled.
export function recordedTitle(): string {
  const file = findRecording(
    path.join(import.meta.dirname, 'recordings'),
    'session-title',
  );
  const { payload } = readRecording(file, 'claude-cli');
  const response = recordedFrames<SDKMessage | SDKControlResponse>(
    payload,
    'output',
  ).find(
    (frame): boolean =>
      frame.type === 'control_response' &&
      frame.response.subtype === 'success' &&
      typeof frame.response.response?.title === 'string',
  );
  if (
    response?.type !== 'control_response' ||
    response.response.subtype !== 'success' ||
    typeof response.response.response?.title !== 'string'
  )
    throw new Error('Missing recorded Agent title');
  return response.response.response.title;
}
