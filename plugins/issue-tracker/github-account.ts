import {
  deviceFlow,
  provideSignIn,
  type Argo,
  type DeviceFlow,
} from '@argo/plugin-kit';
import { githubHost } from './github-api';
import { githubClientId } from './github-client-id';

export const signInOptions = { name: 'GitHub' } as const;

type Calls = Pick<Argo, 'fetch' | 'changed' | 'accounts' | 'secrets'>;

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
  argo: Pick<Argo, 'operations' | 'pages' | 'fetch'>,
  flow: DeviceFlow,
): Promise<void> =>
  provideSignIn(argo, flow, {
    ...signInOptions,
    connectionProblem: async (): Promise<string | null> => {
      const result = await githubConnectionStatus(argo).catch(() => null);

      return result?.status === 'disconnected'
        ? 'GitHub not connected. Sign in to continue.'
        : null;
    },
  });

const unauthorizedStatus = 401;

const okStatus = 200;

// Settings is global, so the broker only lends this Plugin's own single Account here.
export async function githubConnectionStatus(
  argo: Pick<Argo, 'fetch'>,
): Promise<{ status: 'connected' | 'disconnected' | 'unknown' }> {
  const reply = await argo.fetch(`https://${githubHost}/user`, {
    account: githubHost,
  });

  if (!reply || reply.status === unauthorizedStatus)
    return { status: 'disconnected' };

  return { status: reply.status === okStatus ? 'connected' : 'unknown' };
}
