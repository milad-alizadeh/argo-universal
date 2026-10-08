import path from 'node:path';
import { isControlResponse } from '../../../packages/agents/claude/wire.ts';
import { isRecordedFrame as isWireFrame } from '../recording.ts';
import { findRecording, readRecording, recordedFrames } from '../recording.ts';

// The real CLI's response to generate_session_title with persist enabled.
export function recordedTitle(): string {
  const file = findRecording(
    path.join(import.meta.dirname, 'recordings'),
    'session-title',
  );
  const { payload } = readRecording(file, 'claude-cli');
  const response = recordedFrames(payload, 'output', isWireFrame).find(
    (frame): boolean =>
      isControlResponse(frame) &&
      frame.response.subtype === 'success' &&
      typeof frame.response.response?.title === 'string',
  );
  if (
    !isControlResponse(response) ||
    response.response.subtype !== 'success' ||
    typeof response.response.response?.title !== 'string'
  )
    throw new Error('Missing recorded Agent title');
  return response.response.response.title;
}
