import type { OAuthFlowState } from '@argo/plugin-kit';
import { accountHost } from './account-host';

// The two fields of an Account this page draws.
export type Account = { label: string; host: string };

// What the page draws from: this Project's Account, the asking device, and the sign-in the Plugin holds.
export type SignInData = {
  account: Account | null;
  // `context.serverDevice`, stamped by the Server; never inferred from platform or width.
  serverDevice: boolean;
  flow: OAuthFlowState;
};

export type SignInView =
  | { kind: 'signed-in'; account: Account }
  | { kind: 'continue-on-server-device' }
  | { kind: 'signed-out' }
  | { kind: 'waiting' }
  | { kind: 'failed'; title: string; message: string };

/*
 * Signed in on any device: this Project's Account, or the one just added, which a Project with several
 * Accounts has yet to choose. Otherwise only the Server Device signs in, where the browser and Argo's
 * listener are.
 */
export function chooseView({
  account,
  serverDevice,
  flow,
}: SignInData): SignInView {
  if (account) return { kind: 'signed-in', account };

  if (flow.kind === 'signed-in')
    return {
      kind: 'signed-in',
      account: { label: flow.label, host: accountHost },
    };

  if (!serverDevice) return { kind: 'continue-on-server-device' };

  return flowView(flow);
}

function flowView(
  flow: Exclude<OAuthFlowState, { kind: 'signed-in' }>,
): SignInView {
  if (flow.kind === 'idle') return { kind: 'signed-out' };

  if (flow.kind === 'waiting') return flow;

  const title =
    flow.reason === 'port-in-use'
      ? 'Couldn’t start sign-in'
      : 'Couldn’t sign in';

  return { kind: 'failed', title, message: flow.message };
}
