import type { Argo } from '@argo/plugin-kit';
import { clientIdSetting, clientSecretSetting } from './atlassian-oauth';

/*
 * The person's Atlassian OAuth app, from the Plugin's secret Settings: Argo ships no client ID or secret, and the
 * Server keeps both in the OS secret store, never sending them to an App.
 */
type Settings = Pick<Argo, 'settings'>;

async function setting(argo: Settings, key: string): Promise<string | null> {
  const value = await argo.settings.get(key);

  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export const clientId = (argo: Settings): Promise<string | null> =>
  setting(argo, clientIdSetting);

export const clientSecret = (argo: Settings): Promise<string | null> =>
  setting(argo, clientSecretSetting);

// Whether the person set both halves of their OAuth app, so the sign-in page offers the button.
export async function oauthReady(argo: Settings): Promise<boolean> {
  const [id, secret] = await Promise.all([clientId(argo), clientSecret(argo)]);

  return id !== null && secret !== null;
}
