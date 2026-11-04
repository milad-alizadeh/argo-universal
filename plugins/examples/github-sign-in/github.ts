import { oauthFlow, type Argo, type OAuthFlow } from '@argo/plugin-kit';
import { accountHost } from './account-host';

type Calls = Pick<
  Argo,
  'oauth' | 'accounts' | 'secrets' | 'fetch' | 'changed' | 'settings'
>;

// GitHub's login names the Account: only the Plugin knows whose token this is.
async function loginOf(calls: Calls, token: string): Promise<string | null> {
  const response = await calls.fetch(`https://${accountHost}/user`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
  });

  return loginIn(response?.ok ? await response.text() : 'null');
}

// The `login` of GitHub's answer, or null for anything else.
function loginIn(text: string): string | null {
  const login = Object(JSON.parse(text)).login;

  return typeof login === 'string' && login !== '' ? login : null;
}

// The client ID the person set in this Plugin's settings, read when a sign-in starts.
async function clientIdOf(calls: Calls): Promise<string | null> {
  const value = await calls.settings.get('client-id');

  return typeof value === 'string' ? value : null;
}

// GitHub's sign-in: everything GitHub-specific is here; the OAuth flow does the rest.
export const githubSignIn = (calls: Calls): OAuthFlow =>
  oauthFlow(calls, {
    host: accountHost,
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    clientId: () => clientIdOf(calls),
    scopes: ['read:user'],
    label: (token) => loginOf(calls, token),
  });
