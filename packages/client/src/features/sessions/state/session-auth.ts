import type { AgentAuthChange } from '@repo/contracts';

/*
 * A sign-in finished when one was running and the change says it succeeded. Each change repeats the last
 * outcome, so a later `auth_required` that still carries an old success starts no second open.
 */
export const finishedSignIn = (
  wasPending: boolean,
  change: AgentAuthChange,
): boolean => wasPending && settledOk(change);

const settledOk = ({ pending, outcome }: AgentAuthChange): boolean =>
  pending === null && outcome?.status === 'ok';
