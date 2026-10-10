import { SessionSnapshot, SessionUpdate } from '@repo/contracts';
import recordings from './acp-content-recordings.json';

// Captured through the official SDK peer, real Engine conversion and SQL Feed reader.
export const recordedAcpContents = recordings.map((recording) => ({
  agent: recording.agent,
  snapshot: SessionSnapshot.parse(recording.snapshot),
  rows: recording.rows.map((row) => SessionUpdate.parse(row)),
}));
