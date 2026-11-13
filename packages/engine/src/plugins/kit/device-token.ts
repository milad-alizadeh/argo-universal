import type {
  DeviceFlowArgo,
  DeviceFlowOptions,
} from '@repo/contracts/plugins/device-flow-api';
import { z } from 'zod';
import { postForm, TokenAnswer } from './device-http';

/*
 * What the kit keeps under an Account id: the access token, and, when the service gave them, the refresh token and
 * when the access token runs out. A service with expiring tokens, as GitHub's OAuth app has, refuses the access token
 * after `expires_in`; the refresh token gets a new pair without asking the person again.
 */
export type KeptToken = {
  access: string;
  refresh?: string;
  expiresAt?: number;
};

const Kept = z.object({
  access: z.string().min(1),
  refresh: z.string().min(1).optional(),
  expiresAt: z.number().optional(),
});

type Answer = z.infer<typeof TokenAnswer>;

const msPerSecond = 1000;

// `expires_in` is seconds from now.
const expiresAtOf = (expiresIn: number | undefined): number | undefined =>
  expiresIn === undefined ? undefined : Date.now() + expiresIn * msPerSecond;

// The pair a token answer gives, or nothing when it gave no access token.
export function keptFrom(answer: Answer): KeptToken | null {
  if (!answer.access_token) return null;

  // Parsing drops the fields the answer left out, so a token that never runs out keeps none.
  return Kept.parse({
    access: answer.access_token,
    refresh: answer.refresh_token,
    expiresAt: expiresAtOf(answer.expires_in),
  });
}

// A token that never runs out is kept as the bare string, as it was before refresh tokens; anything more as JSON.
export const stored = (kept: KeptToken): string =>
  kept.refresh === undefined && kept.expiresAt === undefined
    ? kept.access
    : JSON.stringify(kept);

// A secret this kit wrote, either shape; a bare string is a token with no refresh and no expiry.
export function keptOf(secret: string): KeptToken {
  try {
    const parsed = Kept.safeParse(JSON.parse(secret));

    if (parsed.success) return parsed.data;
  } catch {
    // Not JSON: a bare token.
  }

  return { access: secret };
}

// Refreshed a minute early, so a request made just before it runs out is not refused on the way.
const marginMs = 60_000;

const runOut = (expiresAt: number | undefined): boolean =>
  expiresAt !== undefined && Date.now() >= expiresAt - marginMs;

// The refresh token, when the access token has run out and there is one to spend.
const dueRefresh = ({ refresh, expiresAt }: KeptToken): string | null =>
  refresh !== undefined && runOut(expiresAt) ? refresh : null;

// RFC 6749 section 6. A device-flow token is refreshed with the client ID alone, no client secret.
async function refreshed(
  fetch: DeviceFlowArgo['fetch'],
  options: DeviceFlowOptions,
  refresh: string,
): Promise<KeptToken | null> {
  const fields = {
    client_id: options.clientId,
    grant_type: 'refresh_token',
    refresh_token: refresh,
  };

  return keptFrom(
    await postForm(fetch, { url: options.tokenUrl, fields }, TokenAnswer),
  );
}

type Calls = Pick<DeviceFlowArgo, 'fetch' | 'secrets'>;

// The service, and the calls that reach it and the Account's secret.
type Source = { argo: Calls; options: DeviceFlowOptions };

// The access token to send now, refreshed and kept first when it has run out.
async function current(source: Source, id: string): Promise<string | null> {
  const secret = await source.argo.secrets.get(id);

  return secret === null ? null : lent(source, id, keptOf(secret));
}

async function lent(
  { argo, options }: Source,
  id: string,
  kept: KeptToken,
): Promise<string> {
  const refresh = dueRefresh(kept);

  if (refresh === null) return kept.access;

  // A refused refresh sends the old token; the service's 401 then draws the sign-in.
  const fresh = await refreshed(argo.fetch, options, refresh);

  if (!fresh) return kept.access;
  await argo.secrets.set(id, stored(fresh));

  return fresh.access;
}

/*
 * Answers each borrow with the Account's current access token. A refresh token works once, so borrows that find the
 * same Account due share one refresh instead of racing to spend it.
 */
export function tokenSource(
  argo: Calls,
  options: DeviceFlowOptions,
): (id: string) => Promise<string | null> {
  const inFlight = new Map<string, Promise<string | null>>();

  return (id) => {
    const running = inFlight.get(id);

    if (running) return running;

    const next = current({ argo, options }, id).finally(() =>
      inFlight.delete(id),
    );

    inFlight.set(id, next);

    return next;
  };
}
