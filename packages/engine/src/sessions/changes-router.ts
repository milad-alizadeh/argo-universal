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
  pagePatch,
  readCheckoutChanges,
  readCheckoutDiff,
  type ChangeComparison,
} from '@repo/git';
import { TRPCError } from '@trpc/server';
import { readProjectPath } from '../projects';
import { publicProcedure, router, routerFactory } from '../rpc';
import type { SessionRouterDeps } from './router-deps';

// A page holds this many files, or this many diff lines, unless the caller asks for fewer or more.
const pageLimits = { files: 50, lines: 400 };

type Page = { cursor?: number; limit?: number };

type Paged<T> = { items: T[]; nextCursor: number | null };

function pageOf<T>(items: readonly T[], page: Page, limit: number): Paged<T> {
  const start = page.cursor ?? 0;
  const end = start + (page.limit ?? limit);

  return {
    items: items.slice(start, end),
    nextCursor: end < items.length ? end : null,
  };
}

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

        const page = pageOf(result.files, input, pageLimits.files);

        return {
          mainBranch: result.mainBranch,
          summary: result.summary,
          files: page.items,
          nextCursor: page.nextCursor,
        };
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

        const page = pagePatch(
          result.patch,
          input.cursor ?? 0,
          input.limit ?? pageLimits.lines,
        );

        return {
          file: result.file,
          patch: { format: 'git_patch' as const, text: page.patch },
          nextCursor: page.nextCursor,
        };
      }),
  }),
);
