import { SessionUpdate } from '@repo/contracts';
import recording from './deep-feed-recording.json';

// Scripted ACP through the Engine and SQL Feed reader; see tools/record-deep-feed.mts.
export const recordedDeepFeed = recording.map((row) =>
  SessionUpdate.parse(row),
);
