import { session } from '@repo/db/schema';
import { createCheckout, type Checkout } from '@repo/git';
import { eq } from 'drizzle-orm';
import { titleFromPrompt } from '../../feed';
import type { NewSessionInput, SessionData } from '../session-data';
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

const checkoutInput = (
  input: NewSessionInput,
  choice: OwnCheckout,
): Parameters<typeof createCheckout>[0] => ({
  projectPath: input.projectPath,
  projectId: input.projectId,
  sessionId: input.sessionId,
  choice,
  runtimeDirectory: input.runtimeDirectory,
});

// The Checkout of the Session that started this one, which it borrows and never owns (ADR-0008).
function readStarterCheckout(input: NewSessionInput): Checkout {
  const starter = input.database
    .select({ path: session.checkoutPath, branch: session.checkoutBranch })
    .from(session)
    .where(eq(session.id, input.startedBySessionId ?? ''))
    .get();

  if (!starter) throw new Error('The starting Session has no Checkout');

  return starter;
}

const sessionCheckout = (
  input: NewSessionInput,
  signal?: AbortSignal,
): Checkout | Promise<Checkout> =>
  input.checkout.type === 'starter'
    ? readStarterCheckout(input)
    : createCheckout(checkoutInput(input, input.checkout), signal);

// The Session row waits until its Agent is ready.
export async function createSessionCheckout(
  input: NewSessionInput,
  signal?: AbortSignal,
): Promise<SessionData> {
  return dataForCheckout(input, await sessionCheckout(input, signal));
}

type InsertData = Pick<
  typeof session.$inferInsert,
  | 'id'
  | 'projectId'
  | 'agent'
  | 'vendorSessionId'
  | 'checkoutPath'
  | 'checkoutBranch'
  | 'configValues'
  | 'heldConfig'
  | 'projectionVersion'
  | 'activityAt'
>;

const sessionInsertData = (data: SessionData): InsertData => ({
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
export function toSessionInsert(
  input: NewSessionInput,
  data: SessionData,
): SessionInsertJob {
  return new SessionInsertJob({
    session: {
      ...sessionInsertData(data),
      title: titleFromPrompt(input.prompt),
      titleSource: 'prompt',
      startedBySessionId: input.startedBySessionId ?? null,
    },
    // The Project remembers where the person starts Sessions, never a borrowed Checkout.
    checkoutChoice:
      input.checkout.type === 'starter' ? undefined : input.checkout,
  });
}
