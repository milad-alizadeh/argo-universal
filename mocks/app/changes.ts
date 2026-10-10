import {
  ChangesSummary,
  SessionChangesOutput,
  SessionDiffOutput,
} from '@repo/contracts';
import { z } from 'zod';
import recordings from './changes-recordings.json';

const ChangesMock = z.strictObject({
  summary: ChangesSummary,
  files: SessionChangesOutput,
  diffs: z.record(z.string(), SessionDiffOutput),
});
export type ChangesMock = z.infer<typeof ChangesMock>;

// Saved Git diffs and explicit procedure responses for the existing Checkout scenarios.
export const changesMocks = {
  none: ChangesMock.parse(recordings.none),
  fewFiles: ChangesMock.parse(recordings.fewFiles),
  manyFiles: ChangesMock.parse(recordings.manyFiles),
  largeDiff: ChangesMock.parse(recordings.largeDiff),
  binaryFile: ChangesMock.parse(recordings.binaryFile),
};
