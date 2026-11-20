import { oauthFlow, type Argo, type OAuthFlow } from '@argo/plugin-kit';
import {
  authorizeUrl,
  clientIdSetting,
  clientSecretSetting,
  hueHost,
  tokenUrl,
} from './hue';
import { bridgeLabel } from './hue-bridge';

/*
 * "Sign in to Philips Hue": the kit's OAuth flow with the Remote API app the person registered with Hue, whose client
 * ID and secret they keep in the Plugin's secret Settings. The kit sends the secret in the token request's form body;
 * whether Hue's v2 token endpoint takes it there, or only as HTTP Basic, is UNCONFIRMED.
 */
type Calls = Pick<
  Argo,
  'oauth' | 'accounts' | 'secrets' | 'fetch' | 'changed' | 'settings'
>;

async function setting(argo: Calls, key: string): Promise<string | null> {
  const value = await argo.settings.get(key);

  return typeof value === 'string' && value !== '' ? value : null;
}

export const hueSignIn = (argo: Calls): OAuthFlow =>
  oauthFlow(argo, {
    host: hueHost,
    authorizeUrl,
    tokenUrl,
    clientId: () => setting(argo, clientIdSetting),
    clientSecret: () => setting(argo, clientSecretSetting),
    label: (token) => bridgeLabel(argo, token),
  });
