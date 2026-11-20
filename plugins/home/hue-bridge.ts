import { accountFetch, type Argo } from '@argo/plugin-kit';
import {
  applicationKeySecret,
  applicationKeyUrl,
  bridgeConfigUrl,
  deviceType,
  hueHost,
  linkButtonUrl,
} from './hue';
import type { HueCalls } from './hue-client';
import { at, list, parseJson, text, type Json } from './json';

/*
 * The Bridge's v1 API through Hue's cloud, where the Remote API presses the link button for the person and then gives
 * this Plugin an application key, which every CLIP v2 call carries. UNCONFIRMED against Hue's login-walled reference.
 */
const jsonHeaders = { 'Content-Type': 'application/json' };

// v1 answers a list of results, each a `success` or an `error`.
const firstResult = (answer: Json | undefined): Json | undefined =>
  list(answer)[0];

const noKey = 'The Hue Bridge gave no key.';

const keyIn = (answer: Json | undefined): string | null =>
  text(at(firstResult(answer), 'success', 'username'));

const refusalIn = (answer: Json | undefined): string =>
  text(at(firstResult(answer), 'error', 'description')) ?? noKey;

async function keepKey(argo: HueCalls, answer: Json | undefined): Promise<void> {
  const key = keyIn(answer);

  if (!key) throw new Error(refusalIn(answer));
  await argo.secrets.set(applicationKeySecret, key);
}

// Presses the link button, asks for a key while it is pressed, and keeps the key.
export async function connectBridge(argo: HueCalls): Promise<void> {
  const send = accountFetch(argo, hueHost);

  await send(linkButtonUrl, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify({ linkbutton: true }),
  });

  const reply = await send(applicationKeyUrl, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ devicetype: deviceType }),
  });

  await keepKey(argo, parseJson(await reply.text()));
  argo.changed();
}

const bridgeName = (config: Json | undefined): string => {
  const id = text(at(config, 'bridgeid'));

  return id ? `Hue Bridge ${id}` : 'Philips Hue';
};

// The kit's `label` for a new token: the Bridge it reaches names the Account, so signing in again keeps one.
export async function bridgeLabel(
  argo: Pick<Argo, 'fetch'>,
  token: string,
): Promise<string | null> {
  const reply = await argo.fetch(bridgeConfigUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return reply?.ok ? bridgeName(parseJson(await reply.text())) : null;
}
