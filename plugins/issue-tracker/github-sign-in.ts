import type { Argo } from '@argo/plugin-kit';
import { runDeviceFlow, type Borrowed, type FlowRun } from './device-flow';
import { githubHost } from './github-api';

// What a page needs to sign the person in: start the flow, with the Account it may rewrite.
export type GitHubSignIn = {
  start: (run: FlowRun) => Promise<void>;
};

type Calls = Pick<Argo, 'fetch' | 'accounts' | 'secrets'>;

/*
 * The Plugin provides the Account it signs in (ADR-0036): a borrow wakes this handler, which hands Argo the token it
 * keeps under the Account's id, and notes which Account was reached so a rejected token can be rewritten in place.
 */
export async function provideGitHubAccount(
  argo: Pick<Argo, 'accounts' | 'secrets'>,
): Promise<Borrowed> {
  const borrowed: Borrowed = { id: null };

  await argo.accounts.provide(
    githubHost,
    { header: 'Authorization', prefix: 'Bearer' },
    (account) => {
      borrowed.id = account.id;

      return argo.secrets.get(account.id);
    },
  );

  return borrowed;
}

export const createGitHubSignIn = (
  calls: Calls,
  borrowed: Borrowed,
): GitHubSignIn => ({
  start: (run) => runDeviceFlow(calls, borrowed, run),
});
