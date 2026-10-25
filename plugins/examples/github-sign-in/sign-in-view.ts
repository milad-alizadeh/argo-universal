import type { SignInResult } from './github-oauth';

// The two fields of an Account this page draws.
export type Account = { label: string; host: string };

// What the sign-in page is doing; the Plugin keeps it, Argo does not know about it.
export type Flow =
  | { kind: 'idle' }
  | { kind: 'waiting'; attempt: symbol }
  | { kind: 'failed'; title: string; message: string };

export type SignInView =
  | { kind: 'signed-in'; account: Account }
  | { kind: 'continue-on-server-device' }
  | Flow;

type Inputs = {
  // `argo.accounts.get(host)`: this Project's Account, or nothing.
  account: Account | null;
  // `context.serverDevice`, stamped by the Server; never inferred from platform or width.
  serverDevice: boolean;
  flow: Flow;
};

export function chooseView({
  account,
  serverDevice,
  flow,
}: Inputs): SignInView {
  if (account) return { kind: 'signed-in', account };

  return serverDevice ? flow : { kind: 'continue-on-server-device' };
}

// A cancelled exchange leaves the page signed out; a finished one shows through the Account.
export function flowOf(result: SignInResult): Flow {
  if (result.kind === 'port-in-use')
    return {
      kind: 'failed',
      title: 'Couldn’t start sign-in',
      message: result.message,
    };

  if (result.kind === 'failed')
    return {
      kind: 'failed',
      title: 'Couldn’t sign in',
      message: result.message,
    };

  return { kind: 'idle' };
}
