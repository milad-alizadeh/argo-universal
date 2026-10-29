import type { session } from '@repo/db/schema';
import { createCheckout, type Checkout } from '@repo/git';
import { titleFromPrompt } from '../../feed';
import type { NewSessionInput, SessionData } from '../session-data';
import { SessionInsertJob } from '../session-storage/session-storage';

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

const checkoutInput = (
  input: NewSessionInput,
): Parameters<typeof createCheckout>[0] => ({
  projectPath: input.projectPath,
  projectId: input.projectId,
  sessionId: input.sessionId,
  choice: input.checkout,
  runtimeDirectory: input.runtimeDirectory,
});

// The Session row waits until its Agent is ready.
export async function createSessionCheckout(
  input: NewSessionInput,
  signal?: AbortSignal,
): Promise<SessionData> {
  const checkout = await createCheckout(checkoutInput(input), signal);

  return dataForCheckout(input, checkout);
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
    checkoutChoice: input.checkout,
  });
}
