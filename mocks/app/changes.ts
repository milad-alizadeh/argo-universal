import {
  ChangesSummary,
  SessionChangesOutput,
  SessionDiffOutput,
} from '@repo/contracts';
import { z } from 'zod';
import recordings from './changes-recordings.json';

const ChangesMock = z.strictObject({
  summary: ChangesSummary,
  files: SessionChangesOutput.shape.files,
  // Whole diffs, recorded before the diff was paged.
  diffs: z.record(z.string(), SessionDiffOutput.omit({ nextCursor: true })),
});

// Saved Git diffs and explicit procedure responses for the existing Checkout scenarios.
export const changesMocks = {
  none: ChangesMock.parse(recordings.none),
  fewFiles: ChangesMock.parse(recordings.fewFiles),
  manyFiles: ChangesMock.parse(recordings.manyFiles),
  largeDiff: ChangesMock.parse(recordings.largeDiff),
  binaryFile: ChangesMock.parse(recordings.binaryFile),
};
