import { SessionUpdate } from '@repo/contracts';
import recording from './report-recording.json';

// Recorded by `node tools/record-reports.mts`: scripted ACP through the real Engine, not Claude.
export const recordedReports = {
  ...recording,
  parent: recording.parent.map((row) => SessionUpdate.parse(row)),
  child: recording.child.map((row) => SessionUpdate.parse(row)),
};
