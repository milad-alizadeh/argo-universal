import { realpathSync } from 'node:fs';
import { session } from '@repo/db/schema';
import { createCheckout, type Checkout } from '@repo/git';
import { eq } from 'drizzle-orm';
import { titleFromPrompt } from '../../feed';
import type { NewSessionInput, SessionData } from '../session-data';
import { readStoredCheckout } from '../session-record';
import { SessionInsertJob } from '../session-storage';

type InitialProgress = Pick<
  SessionData,
  | 'epoch'
  | 'maxRevision'
  | 'nextPosition'
  | 'kept'
  | 'undisclosedInterruptedTurnId'
>;

const initialProgress = (): InitialProgress => ({
  epoch: 0,
  maxRevision: 0,
  nextPosition: 0,
  kept: false,
  undisclosedInterruptedTurnId: null,
});

const dataForCheckout = (
  input: NewSessionInput,
  checkout: Checkout,
): SessionData => ({
  ...initialProgress(),
  kept: input.keep === true,
  sessionId: input.sessionId,
  projectId: input.projectId,
  agent: input.agent,
  vendorSessionId: null,
  checkout,
  configValues: input.configOptions,
  heldConfig: [],
  activityAt: Date.now(),
});

type OwnCheckout = Exclude<NewSessionInput['checkout'], { type: 'starter' }>;

// Git reports canonical paths, while older Session rows can use a symlink to the worktree.
function isSameCheckout(storedPath: string, path: string): boolean {
  if (storedPath === path) return true;

  try {
    return realpathSync.native(storedPath) === path;
  } catch {
    return false;
  }
}

function usesCheckout(input: NewSessionInput, path: string): boolean {
  const checkouts = input.database
    .selectDistinct({ path: session.checkoutPath })
    .from(session)
    .where(eq(session.projectId, input.projectId))
    .all();

  return checkouts.some((checkout) => isSameCheckout(checkout.path, path));
}

const checkoutInput = (
  input: NewSessionInput,
  choice: OwnCheckout,
): Parameters<typeof createCheckout>[0] => ({
  projectPath: input.projectPath,
  projectId: input.projectId,
  sessionId: input.sessionId,
  choice,
  runtimeDirectory: input.runtimeDirectory,
  isOwned: (path): boolean => usesCheckout(input, path),
});

// The Checkout of the Session that started this one, which it borrows and never owns (ADR-0008).
function readStarterCheckout(
  input: NewSessionInput,
): NonNullable<ReturnType<typeof readStoredCheckout>> {
  const starter = readStoredCheckout(
    input.database,
    input.startedBySessionId ?? '',
  );

  if (!starter) throw new Error('The starting Session has no Checkout');

  return starter;
}

function borrowedCheckout(input: NewSessionInput): Checkout {
  const { path, branch } = readStarterCheckout(input);

  return { path, branch };
}

const sessionCheckout = (
  input: NewSessionInput,
  signal?: AbortSignal,
): Checkout | Promise<Checkout> =>
  input.checkout.type === 'starter'
    ? borrowedCheckout(input)
    : createCheckout(checkoutInput(input, input.checkout), signal);

// The Session row waits until its Agent is ready.
export async function createSessionCheckout(
  input: NewSessionInput,
  signal?: AbortSignal,
): Promise<SessionData> {
  return dataForCheckout(input, await sessionCheckout(input, signal));
}

type SessionInsertData = typeof session.$inferInsert;

const sessionInsertData = (data: SessionData): SessionInsertData => ({
  id: data.sessionId,
  projectId: data.projectId,
  agent: data.agent,
  vendorSessionId: data.vendorSessionId,
  checkoutPath: data.checkout.path,
  checkoutBranch: data.checkout.branch,
  configValues: data.configValues,
  heldConfig: data.heldConfig,
  projectionVersion: 1,
  activityAt: data.activityAt,
});

// The writer job that stores the Session and remembers its checkout choice on the Project.
function borrowedCheckoutType(input: NewSessionInput): 'main' | 'starter' {
  return readStarterCheckout(input).type === 'main' ? 'main' : 'starter';
}

function namedCheckoutType(branch: string | undefined): 'worktree' | undefined {
  return branch === undefined ? undefined : 'worktree';
}

function storedCheckoutType(
  input: NewSessionInput,
): SessionInsertData['checkoutType'] {
  const { checkout } = input;

  if (checkout.type === 'starter') return borrowedCheckoutType(input);

  if (checkout.type === 'worktree') return namedCheckoutType(checkout.branch);

  return undefined;
}

function rememberedChoice({
  checkout,
}: NewSessionInput):
  | Extract<OwnCheckout, { type: 'main' }>
  | { type: 'worktree'; baseBranch: string }
  | undefined {
  if (checkout.type === 'worktree')
    return { type: 'worktree', baseBranch: checkout.baseBranch };

  return checkout.type === 'main' ? checkout : undefined;
}

export function toSessionInsert(
  input: NewSessionInput,
  data: SessionData,
): SessionInsertJob {
  return new SessionInsertJob({
    session: {
      ...sessionInsertData(data),
      checkoutType: storedCheckoutType(input),
      title: titleFromPrompt(input.prompt),
      titleSource: 'prompt',
      startedBySessionId: input.startedBySessionId ?? null,
    },
    // An independent Schedule has its own saved Checkout choice.
    checkoutChoice:
      input.rememberCheckout === false ? undefined : rememberedChoice(input),
  });
}
