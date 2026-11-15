import type { Argo } from '@repo/contracts/plugins/argo-api';
import { z } from 'zod';

/*
 * What a kit sign-in keeps under an Account id: the access token, and, when the service gave them, the refresh token
 * and when the access token runs out, in epoch milliseconds. A service with expiring tokens refuses the access token
 * after `expires_in`; the refresh token gets a new one without asking the person again. The device flow and the
 * redirect flow keep it alike; each supplies only how its service refreshes.
 */
export const KeptToken = z.object({
  access: z.string().min(1),
  refresh: z.string().min(1).optional(),
  expiresAtMs: z.number().optional(),
});

export type KeptToken = z.infer<typeof KeptToken>;

/*
 * What a service's refresh gave: the new token; `refused` when the refresh token expired or was revoked, so only
 * signing in again helps; or nothing, when it could not say.
 */
export type Refreshed = KeptToken | 'refused' | null;

export type Refresh = (refresh: string) => Promise<Refreshed>;

const msPerSecond = 1000;

// When a token whose answer said `expires_in`, seconds from now, runs out.
export const expiresAtMsOf = (
  expiresIn: number | undefined,
): number | undefined =>
  expiresIn === undefined ? undefined : Date.now() + expiresIn * msPerSecond;

// A token that never runs out is kept as the bare string, as it was before refresh tokens; anything more as JSON.
export const secretOf = (token: KeptToken): string =>
  token.refresh === undefined && token.expiresAtMs === undefined
    ? token.access
    : JSON.stringify(token);

// A secret written as JSON; anything else, a secret from before refresh tokens included, is the bare access token.
function tokenFromSecret(secret: string): KeptToken {
  try {
    const parsed = KeptToken.safeParse(JSON.parse(secret));

    if (parsed.success) return parsed.data;
  } catch {
    // JSON.parse refuses a bare token.
  }

  return { access: secret };
}

// Refreshed a minute early, so a request made just before it runs out is not refused on the way.
const marginMs = 60_000;

const runOut = (expiresAtMs: number | undefined): boolean =>
  expiresAtMs !== undefined && Date.now() >= expiresAtMs - marginMs;

// The refresh token, when the access token has run out and there is one to spend.
const dueRefresh = ({ refresh, expiresAtMs }: KeptToken): string | null =>
  refresh !== undefined && runOut(expiresAtMs) ? refresh : null;

type Secrets = Pick<Argo['secrets'], 'get' | 'set' | 'delete'>;

// The Account's secret and how its service refreshes.
type Lending = { secrets: Secrets; refresh: Refresh };

// The access token to lend now: the kept one, or a refreshed one kept first when it has run out.
async function lendable(lending: Lending, id: string): Promise<string | null> {
  const secret = await lending.secrets.get(id);

  return secret === null ? null : renewed(lending, id, tokenFromSecret(secret));
}

const keepingRefresh = (fresh: KeptToken, spent: string): KeptToken => ({
  ...fresh,
  refresh: fresh.refresh ?? spent,
});

/*
 * A refused refresh forgets the token and lends nothing, so the borrow finds the person signed out and the sign-in
 * page draws until they sign in again, which keeps a new token under the same Account. An unanswered
 * or failed one lends the old token; the service's 401 then does the same. A service that keeps its refresh token
 * answers without one, so the old one is kept.
 *
 * The new pair is kept before its access token is lent: a rotated refresh token works once, so a Server that stopped
 * between the two would otherwise wake holding only the spent one.
 */
async function renewed(
  lending: Lending,
  id: string,
  kept: KeptToken,
): Promise<string | null> {
  const spent = dueRefresh(kept);

  if (spent === null) return kept.access;

  const fresh = await lending.refresh(spent).catch(() => null);

  return lent(lending.secrets, id, { kept, spent, fresh });
}

// A refresh token the service refused is not spent again, with the client secret, on each later borrow.
async function forgotten(secrets: Secrets, id: string): Promise<null> {
  await secrets.delete(id);

  return null;
}

type Renewal = { kept: KeptToken; spent: string; fresh: Refreshed };

async function lent(
  secrets: Secrets,
  id: string,
  { kept, spent, fresh }: Renewal,
): Promise<string | null> {
  if (fresh === 'refused') return forgotten(secrets, id);

  if (!fresh) return kept.access;
  await secrets.set(id, secretOf(keepingRefresh(fresh, spent)));

  return fresh.access;
}

/*
 * Answers each borrow with the Account's current access token. A refresh token works once, so borrows that find the
 * same Account due share one refresh; two refreshes racing would spend it twice, and the second would sign the person
 * out.
 */
export function tokenLender(
  secrets: Secrets,
  refresh: Refresh,
): (id: string) => Promise<string | null> {
  const inFlight = new Map<string, Promise<string | null>>();

  return (id) => {
    const running = inFlight.get(id);

    if (running) return running;

    const next = lendable({ secrets, refresh }, id).finally(() =>
      inFlight.delete(id),
    );

    inFlight.set(id, next);

    return next;
  };
}
