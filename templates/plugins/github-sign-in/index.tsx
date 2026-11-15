import { deviceFlow, provideSignIn, type Argo } from '@argo/plugin-kit';

// The reference sign-in: copy this Plugin, and change the URLs and the client ID for another service that has a device flow.
export async function register(argo: Argo): Promise<void> {
  const flow = deviceFlow(argo, {
    host: 'api.github.com',
    name: 'GitHub',
    // A device-flow app has no secret; its ID is public, and only names the app on GitHub's page.
    clientId: 'Ov23livvjnJww4D3CYGd',
    scope: 'read:user',
    deviceUrl: 'https://github.com/login/device/code',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    label: { url: 'https://api.github.com/user', field: 'login' },
  });

  // The Operations the page's buttons run, the page `contributes.accounts` names, and the Account's provider.
  await provideSignIn(argo, flow, { name: 'GitHub' });
}
