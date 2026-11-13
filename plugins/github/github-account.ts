import {
  deviceFlow,
  provideSignIn,
  type Argo,
  type DeviceFlow,
} from '@argo/plugin-kit';
import { githubHost } from './pull-reads';

type Calls = Pick<Argo, 'fetch' | 'changed' | 'accounts' | 'secrets'>;

/*
 * The client ID of Argo's GitHub OAuth app, the one with device flow switched on. It is public by design: a device-flow
 * app has no secret, and the ID only names the app on GitHub's authorisation page.
 */
const githubClientId = 'Ov23livvjnJww4D3CYGd';

// GitHub's device flow, its one way to sign in without a client secret; it finishes from a paired phone too.
export const githubSignIn = (argo: Calls): DeviceFlow =>
  deviceFlow(argo, {
    host: githubHost,
    name: 'GitHub',
    clientId: githubClientId,
    scope: 'repo',
    deviceUrl: 'https://github.com/login/device/code',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    label: { url: `https://${githubHost}/user`, field: 'login' },
  });

// The Operations, the sign-in page and the Account's provider: everything else is the kit's.
export const provideGitHub = (
  argo: Pick<Argo, 'operations' | 'pages'>,
  flow: DeviceFlow,
): Promise<void> => provideSignIn(argo, flow, { name: 'GitHub' });
