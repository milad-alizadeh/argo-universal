import type { Argo, PageState } from '@argo/plugin-kit';
import { deviceFlow, type DeviceFlow } from './device-flow';
import { githubHost } from './github-api';
import { githubClientId } from './github-client-id';
import { SignInScreen, type SignInData } from './sign-in-screen';
import type { GatedPage } from './signed-in-gate';

type Calls = Pick<
  Argo,
  'fetch' | 'changed' | 'accounts' | 'secrets' | 'operations' | 'pages'
>;

// GitHub's device flow, its one way to sign in without a client secret; it finishes from a paired phone too.
export const githubSignIn = (calls: Calls): DeviceFlow =>
  deviceFlow(calls, {
    host: githubHost,
    name: 'GitHub',
    clientId: githubClientId,
    scope: 'repo',
    deviceUrl: 'https://github.com/login/device/code',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    label: { url: `https://${githubHost}/user`, field: 'login' },
  });

// The Operations the sign-in page's buttons run.
function registerOperations(argo: Calls, flow: DeviceFlow): void {
  argo.operations.register('signIn', async () => ({ ...(await flow.start()) }));
  argo.operations.register('cancelSignIn', () => ({ ...flow.cancel() }));
}

// The page `contributes.accounts` names, drawn from the flow's state.
const signInPage = (flow: DeviceFlow): GatedPage<PageState, SignInData> => ({
  load: () => ({ flow: flow.state(), rejected: null }),
  render: (data, to) => (
    <SignInScreen
      {...data}
      start={to.run('signIn', {})}
      cancel={to.run('cancelSignIn', {})}
    />
  ),
});

/*
 * Wires the sign-in into the Plugin: the Operations its buttons run, the page `contributes.accounts` names, and the
 * handler other Plugins borrow the Account through. Nothing outside the kit's calls sees a token.
 */
export async function provideGitHub(
  argo: Calls,
  flow: DeviceFlow,
): Promise<void> {
  registerOperations(argo, flow);
  argo.pages.define('/sign-in', signInPage(flow));

  await argo.accounts.provide(
    githubHost,
    { header: 'Authorization', prefix: 'Bearer' },
    (account) => argo.secrets.get(account.id),
  );
}
