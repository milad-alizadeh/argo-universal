import type {
  SessionChangesInput,
  SessionChangesOutput,
  SessionDiffInput,
  SessionDiffOutput,
} from '@repo/contracts';
import { readChangedFiles, readFileDiff } from '@repo/git';
import { TRPCError } from '@trpc/server';
import { readProjectPath } from '../projects';
import type { SessionRouterDeps } from './router-deps';

type ReaderDeps = Pick<SessionRouterDeps, 'readSession' | 'database'>;

const selection = (
  deps: ReaderDeps,
  input: SessionChangesInput | SessionDiffInput,
): Parameters<typeof readChangedFiles>[0] => {
  const session = deps.readSession(input.sessionId);

  return {
    checkout: session.checkout.path,
    projectCheckout: readProjectPath(deps.database, session.projectId),
    comparison: input.comparison,
  };
};

export const readSessionChanges = (
  deps: ReaderDeps,
  input: SessionChangesInput,
): Promise<SessionChangesOutput> =>
  readChangedFiles(selection(deps, input), input);

const missingDiff = (path: string): TRPCError =>
  new TRPCError({ code: 'NOT_FOUND', message: `No changed file ${path}` });

export async function readSessionDiff(
  deps: ReaderDeps,
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
