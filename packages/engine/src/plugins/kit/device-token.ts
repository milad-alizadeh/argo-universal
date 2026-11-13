import type {
  DeviceFlowArgo,
  DeviceFlowOptions,
} from '@repo/contracts/plugins/device-flow-api';
import { z } from 'zod';
import { postForm, TokenAnswer } from './device-http';

/*
 * What the kit keeps under an Account id: the access token, and, when the service gave them, the refresh token and
 * when the access token runs out, in epoch milliseconds. A service with expiring tokens, as GitHub's OAuth app has,
 * refuses the access token after `expires_in`; the refresh token gets a new one without asking the person again.
 */
export const KeptToken = z.object({
  access: z.string().min(1),
  refresh: z.string().min(1).optional(),
  expiresAtMs: z.number().optional(),
});

export type KeptToken = z.infer<typeof KeptToken>;

const msPerSecond = 1000;

// `expires_in` is seconds from now.
const expiresAtMsOf = (expiresIn: number | undefined): number | undefined =>
  expiresIn === undefined ? undefined : Date.now() + expiresIn * msPerSecond;

// The token a token answer gives, or nothing when it gave no access token.
export function tokenFromAnswer(
  answer: z.infer<typeof TokenAnswer>,
): KeptToken | null {
  if (!answer.access_token) return null;

  return {
    access: answer.access_token,
    refresh: answer.refresh_token,
    expiresAtMs: expiresAtMsOf(answer.expires_in),
  };
}

// A token that never runs out is kept as the bare string, as it was before refresh tokens; anything more as JSON.
export const secretOf = (token: KeptToken): string =>
  token.refresh === undefined && token.expiresAtMs === undefined
    ? token.access
    : JSON.stringify(token);

// A secret written as JSON; anything else, a secret from before refresh tokens included, is the bare access token.
export function tokenFromSecret(secret: string): KeptToken {
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

// The service and the calls that reach it and the Account's secret.
type TokenService = {
  argo: Pick<DeviceFlowArgo, 'fetch' | 'secrets'>;
  options: DeviceFlowOptions;
};

/*
 * RFC 6749 section 6. A device-flow token is refreshed with the client ID alone, no client secret. A service that
 * keeps the refresh token answers without one, so the old one is kept; nothing back, or a failed call, is a refusal.
 */
async function refreshAt(
  { argo, options }: TokenService,
  refresh: string,
): Promise<KeptToken | null> {
  const fields = {
    client_id: options.clientId,
    grant_type: 'refresh_token',
    refresh_token: refresh,
  };

  const target = { url: options.tokenUrl, fields };
  const answer = await postForm(argo.fetch, target, TokenAnswer);
  const token = tokenFromAnswer(answer);

  return token && { ...token, refresh: token.refresh ?? refresh };
}

// The access token to lend now: the kept one, or a refreshed one kept first when it has run out.
async function lendable(
  service: TokenService,
  id: string,
): Promise<string | null> {
  const secret = await service.argo.secrets.get(id);

  return secret === null ? null : renewed(service, id, tokenFromSecret(secret));
}

async function renewed(
  service: TokenService,
  id: string,
  kept: KeptToken,
): Promise<string> {
  const refresh = dueRefresh(kept);

  if (refresh === null) return kept.access;

  // A refused refresh lends the old token; the service's 401 then draws the sign-in.
  const fresh = await refreshAt(service, refresh).catch(() => null);

  if (!fresh) return kept.access;
  await service.argo.secrets.set(id, secretOf(fresh));

  return fresh.access;
}

/*
 * Answers each borrow with the Account's current access token. A refresh token works once, so borrows that find the
 * same Account due share one refresh; two refreshes racing would spend it twice, and the second would sign the person
 * out.
 */
export function tokenLender(
  service: TokenService,
): (id: string) => Promise<string | null> {
  const inFlight = new Map<string, Promise<string | null>>();

  return (id) => {
    const running = inFlight.get(id);

    if (running) return running;

    const next = lendable(service, id).finally(() => inFlight.delete(id));

    inFlight.set(id, next);

    return next;
  };
}
