import type {
  SessionChangesInput,
  SessionChangesOutput,
  SessionDiffInput,
  SessionDiffOutput,
} from '@repo/contracts';
import {
  readChangedFiles,
  readFileDiff,
  type ChangesSelection,
} from '@repo/git';
import { TRPCError } from '@trpc/server';
import { sessionChangesSelection } from './changes-selection';
import type { SessionSources } from './session-sources';

type ChangeSources = Pick<SessionSources, 'readSession' | 'database'>;

const selection = (
  sources: ChangeSources,
  input: SessionChangesInput | SessionDiffInput,
): ChangesSelection =>
  sessionChangesSelection(
    sources.database,
    sources.readSession(input.sessionId),
    input.comparison,
  );

export const readSessionChanges = (
  sources: ChangeSources,
  input: SessionChangesInput,
): Promise<SessionChangesOutput> =>
  readChangedFiles(selection(sources, input), input);

const missingDiff = (path: string): TRPCError =>
  new TRPCError({ code: 'NOT_FOUND', message: `No changed file ${path}` });

export async function readSessionDiff(
  sources: ChangeSources,
  input: SessionDiffInput,
): Promise<SessionDiffOutput> {
  const diff = await readFileDiff(
    { ...selection(sources, input), path: input.path },
    input,
  );

  if (!diff) throw missingDiff(input.path);

  return {
    file: diff.file,
    patch: { format: 'git_patch', text: diff.patch },
    nextCursor: diff.nextCursor,
  };
}
