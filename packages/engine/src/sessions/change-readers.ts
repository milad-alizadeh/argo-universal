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
import type { OpenSessions } from './open-sessions';

const selection = (
  deps: OpenSessions,
  input: SessionChangesInput | SessionDiffInput,
): ChangesSelection =>
  sessionChangesSelection(
    deps.database,
    deps.readSession(input.sessionId),
    input.comparison,
  );

export const readSessionChanges = (
  deps: OpenSessions,
  input: SessionChangesInput,
): Promise<SessionChangesOutput> =>
  readChangedFiles(selection(deps, input), input);

const missingDiff = (path: string): TRPCError =>
  new TRPCError({ code: 'NOT_FOUND', message: `No changed file ${path}` });

export async function readSessionDiff(
  deps: OpenSessions,
  input: SessionDiffInput,
): Promise<SessionDiffOutput> {
  const diff = await readFileDiff(
    { ...selection(deps, input), path: input.path },
    input,
  );

  if (!diff) throw missingDiff(input.path);

  return {
    file: diff.file,
    patch: { format: 'git_patch', text: diff.patch },
    nextCursor: diff.nextCursor,
  };
}
