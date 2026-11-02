import { defineAccount } from '@argo/plugin-kit/sign-in';
import { githubHost } from './github-api';
import { githubClientId } from './github-client-id';

// GitHub's device flow, its one way to sign in without a client secret; it finishes from a paired phone too.
export const github = defineAccount({
  host: githubHost,
  name: 'GitHub',
  flow: 'device',
  clientId: githubClientId,
  scope: 'repo',
  deviceUrl: 'https://github.com/login/device/code',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  label: { url: `https://${githubHost}/user`, field: 'login' },
});
