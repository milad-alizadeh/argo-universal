import type { Argo } from '@argo/plugin-kit';
import {
  isReply,
  parseJson,
  postForm,
  seconds,
  text,
  type Fields,
  type Reply,
} from './reply';

// What the Plugin's secrets hold under an Account's id. Only this module and the sign-in that saves it read it.
export type Tokens = {
  access: string;
  refresh: string | null;
  // Null for a token that does not expire, such as GitHub's device-flow one.
  expiresAt: number | null;
};

const msPerSecond = 1000;

// Early enough that a token is not handed out to die on the way to the service.
const refreshMarginMs = 60_000;

const expiryOf = (reply: Reply): number | null => {
  const expiresIn = seconds(reply, 'expires_in');

  return expiresIn === null ? null : Date.now() + expiresIn * msPerSecond;
};

export const tokensOf = (reply: Reply): Tokens | null => {
  const access = text(reply, 'access_token');

  return access === null
    ? null
    : {
        access,
        refresh: text(reply, 'refresh_token'),
        expiresAt: expiryOf(reply),
      };
};

const savedTokens = (saved: Reply): Tokens | null => {
  const access = text(saved, 'access');

  return access === null
    ? null
    : {
        access,
        refresh: text(saved, 'refresh'),
        expiresAt: seconds(saved, 'expiresAt'),
      };
};

const heldTokens = (stored: string | null): Tokens | null => {
  const saved = stored === null ? null : parseJson(stored);

  return isReply(saved) ? savedTokens(saved) : null;
};

const expiring = ({ refresh, expiresAt }: Tokens): boolean =>
  refresh !== null &&
  expiresAt !== null &&
  Date.now() > expiresAt - refreshMarginMs;

type Client = { clientId: string; tokenUrl: string; name: string };

export type TokenCalls = Pick<Argo, 'fetch' | 'secrets'>;

const refreshFields = (client: Client, held: Tokens): Fields => ({
  grant_type: 'refresh_token',
  client_id: client.clientId,
  refresh_token: held.refresh ?? '',
});

// A service may rotate the refresh token, and one that keeps it answers without one.
const keptRefresh = (tokens: Tokens, held: Tokens): Tokens => ({
  ...tokens,
  refresh: tokens.refresh ?? held.refresh,
});

type Refresher = { calls: TokenCalls; client: Client };

async function refreshed(
  { calls, client }: Refresher,
  id: string,
  held: Tokens,
): Promise<string> {
  const target = { url: client.tokenUrl, name: client.name };
  const fields = refreshFields(client, held);
  const tokens = tokensOf(await postForm(calls.fetch, target, fields));

  if (!tokens) return held.access;

  await calls.secrets.set(id, JSON.stringify(keptRefresh(tokens, held)));

  return tokens.access;
}

type Refresh = (id: string, held: Tokens) => Promise<string>;

// One refresh runs per Account, since a second with the same rotating refresh token could invalidate both.
function oneAtATime(refresh: Refresh): Refresh {
  const running = new Map<string, Promise<string>>();

  return (id, held) => {
    const current =
      running.get(id) ?? refresh(id, held).finally(() => running.delete(id));

    running.set(id, current);

    return current;
  };
}

/*
 * The provider's handler (ADR-0036): the Account's current token, refreshed first when it is about to run out. A refresh
 * that fails hands out the old token, whose 401 sends the person to sign in again.
 */
export function createTokenSource(
  calls: TokenCalls,
  client: Client,
): (id: string) => Promise<string | null> {
  const refresh = oneAtATime((id, held) =>
    refreshed({ calls, client }, id, held).catch(() => held.access),
  );

  return async (id) => {
    const held = heldTokens(await calls.secrets.get(id));

    if (!held) return null;

    return expiring(held) ? refresh(id, held) : held.access;
  };
}
