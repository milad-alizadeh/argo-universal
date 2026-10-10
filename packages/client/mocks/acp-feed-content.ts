import { SessionUpdate, SessionSnapshot } from '@repo/contracts';
import recordings from './acp-content-recordings.json';
import type { MockAgent } from './feed-message-mock';

// Captured through the official SDK peer, real Engine conversion and SQL Feed reader.
const contentRecordings = recordings.map((recording) => ({
  agent: recording.agent,
  snapshot: SessionSnapshot.parse(recording.snapshot),
  rows: recording.rows.map((row) => SessionUpdate.parse(row)),
}));

export function recordedAcpContent(
  agent: MockAgent,
): (typeof contentRecordings)[number] {
  const recording = contentRecordings.find(
    (recording) => recording.agent === agent,
  );
  if (!recording) throw new Error(`No ACP content recording for ${agent}`);
  return recording;
}
