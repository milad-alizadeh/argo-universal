import {
  SessionBranchesInput,
  SessionBranchesOutput,
  SessionChangesInput,
  SessionChangesOutput,
  SessionDiffInput,
  SessionDiffOutput,
  type SessionComparison,
} from '@repo/contracts';
import {
  listComparisonBranches,
  readCheckoutChanges,
  readCheckoutDiff,
  type ChangeComparison,
} from '@repo/git';
import { TRPCError } from '@trpc/server';
import { readProjectPath } from '../projects';
import { publicProcedure, router, routerFactory } from '../rpc';
import type { SessionRouterDeps } from './router-deps';

const gitComparison = (
  comparison: SessionComparison | undefined,
): ChangeComparison => {
  if (comparison === undefined || comparison === 'main')
    return { type: 'main' };

  if (comparison === 'uncommitted') return { type: 'uncommitted' };

  return { type: 'branch', branch: comparison.branch };
};

export const createChangesRouter = routerFactory((deps: SessionRouterDeps) =>
  router({
    branches: publicProcedure
      .input(SessionBranchesInput)
      .output(SessionBranchesOutput)
      .query(async ({ input }) => {
        const session = deps.readSession(input.sessionId);

        return {
          branches: await listComparisonBranches(session.checkout.path),
        };
      }),
    changes: publicProcedure
      .input(SessionChangesInput)
      .output(SessionChangesOutput)
      .query(async ({ input }) => {
        const session = deps.readSession(input.sessionId);

        const result = await readCheckoutChanges(
          session.checkout.path,
          readProjectPath(deps.database, session.projectId),
          gitComparison(input.comparison),
        );

        return { mainBranch: result.mainBranch, files: result.files };
      }),
    diff: publicProcedure
      .input(SessionDiffInput)
      .output(SessionDiffOutput)
      .query(async ({ input }) => {
        const session = deps.readSession(input.sessionId);

        const result = await readCheckoutDiff(
          session.checkout.path,
          readProjectPath(deps.database, session.projectId),
          gitComparison(input.comparison),
          input.path,
        );

        if (!result)
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `No changed file ${input.path}`,
          });

        return {
          file: result.file,
          patch: { format: 'git_patch' as const, text: result.patch },
        };
      }),
  }),
);
