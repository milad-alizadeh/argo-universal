import type {
  OAuthFlowArgo,
  OAuthFlowOptions,
} from '@repo/contracts/plugins/oauth-flow-api';
import { z } from 'zod';
import { formPost } from './form-body';
import {
  expiresAtMsOf,
  type KeptToken,
  type Refresh,
  type Refreshed,
} from './kept-token';

const AnswerJson = z.json();

type AnswerJson = z.infer<typeof AnswerJson>;

// A token endpoint's answer as JSON, or null for one that is not.
export const parsed = (text: string): AnswerJson => {
  try {
    return AnswerJson.parse(JSON.parse(text));
  } catch {
    return null;
  }
};

const accessPath = ['access_token'] as const;

// The token at `path` in the endpoint's JSON answer, or null for anything else, an answer that is not JSON too.
function tokenIn(answer: AnswerJson, path: readonly string[]): string | null {
  const token = path.reduceRight<z.ZodType<string>>(
    (inner, key) =>
      z
        .object({ [key]: inner })
        .transform((at) => at[key])
        .pipe(z.string()),
    z.string().min(1),
  );

  return token.safeParse(answer).data ?? null;
}

const AnswerObject = z.record(z.string(), z.json());

// The JSON object `keys` lead to, or nothing when they lead elsewhere.
const objectAt = (answer: AnswerJson, keys: readonly string[]): AnswerJson =>
  keys.reduce<AnswerJson>(
    (at, key) => AnswerObject.safeParse(at).data?.[key] ?? null,
    answer,
  );

// RFC 6749 section 5.1: what may sit beside the access token.
const RefreshToken = z.string().min(1);

const Lifetime = z.number().nonnegative();

type Siblings = { refresh?: string; expiresIn?: number };

/*
 * The refresh token and lifetime beside the token at `path`. Each is read on its own, so a lifetime sent as a string
 * still keeps the refresh token; a token with no lifetime is lent until the service refuses it.
 */
function siblingsAt(answer: AnswerJson, path: readonly string[]): Siblings {
  const at = AnswerObject.safeParse(objectAt(answer, path.slice(0, -1))).data;

  return {
    refresh: RefreshToken.safeParse(at?.refresh_token).data,
    expiresIn: Lifetime.safeParse(at?.expires_in).data,
  };
}

/*
 * The token in a token endpoint's answer, with the refresh token and lifetime that sit beside it, so a service that
 * nests the token, as Slack's `authed_user` does, nests those too.
 */
export function keptIn(
  text: string,
  path: readonly string[] = accessPath,
): KeptToken | null {
  const answer = parsed(text);
  const access = tokenIn(answer, path);

  if (access === null) return null;

  const { refresh, expiresIn } = siblingsAt(answer, path);

  return { access, refresh, expiresAtMs: expiresAtMsOf(expiresIn) };
}

type Given = OAuthFlowOptions['clientId'];

// A value as a sign-in or a refresh reads it: given, or read from where the Plugin keeps it.
async function read(given: Given): Promise<string | null> {
  const value = typeof given === 'function' ? await given() : given;

  return value || null;
}

// What a token request says of the client (RFC 6749 section 2.3.1): its ID, and its secret when the service needs one.
export type Client = { client_id: string; client_secret?: string };

const noClientId = 'This Plugin has no OAuth client ID yet.';

const noClientSecret =
  'This Plugin has no OAuth client secret yet. Set it in the Plugin’s settings.';

// The secret a confidential client reads; nothing at all for a public client, which was given none to read.
const secretOf = (
  options: OAuthFlowOptions,
): Promise<string | null> | undefined =>
  options.clientSecret === undefined ? undefined : read(options.clientSecret);

function withSecret(
  clientId: string,
  secret: string | null | undefined,
): Client | string {
  if (secret === undefined) return { client_id: clientId };

  return secret === null
    ? noClientSecret
    : { client_id: clientId, client_secret: secret };
}

/*
 * The client a token request sends, or what the Plugin has not set yet. A flow given no `clientSecret` is a public
 * client; one given a `clientSecret` that reads nothing cannot sign in, since the service would refuse it.
 */
export async function clientOf(
  options: OAuthFlowOptions,
): Promise<Client | string> {
  const clientId = await read(options.clientId);

  if (!clientId) return noClientId;

  return withSecret(clientId, await secretOf(options));
}

// RFC 6749 section 6: the client, with its secret when it has one, and the refresh token.
export const oauthRefresh =
  (fetch: OAuthFlowArgo['fetch'], options: OAuthFlowOptions): Refresh =>
  async (refresh) => {
    const client = await clientOf(options);

    if (typeof client === 'string') return null;

    const reply = await fetch(
      options.tokenUrl,
      formPost({
        grant_type: 'refresh_token',
        ...client,
        refresh_token: refresh,
      }),
    );

    return refreshedBy(reply, options.tokenPath);
  };

const badRequest = 400;

const unauthorized = 401;

// RFC 6749 section 5.2's errors that say this refresh token, or this client, will not be accepted again.
const refusedErrors: ReadonlySet<string> = new Set([
  'invalid_grant',
  'invalid_client',
  'unauthorized_client',
]);

const RefusalJson = z.object({ error: z.string() });

/*
 * RFC 6749 section 5.2: a refresh token that expired or was revoked is refused with `invalid_grant`, a 400, and a
 * client the service no longer accepts with a 401. Atlassian refuses a spent or expired rotating refresh token with a
 * 403 and `unauthorized_client`, so the error the answer names counts too. Signing in again is the way on from any of
 * them. Any other failure, no answer at all among them, gives no token, and the kept one is tried.
 */
const refusedStatuses: ReadonlySet<number> = new Set([
  badRequest,
  unauthorized,
]);

const namesRefusal = (text: string): boolean =>
  refusedErrors.has(RefusalJson.safeParse(parsed(text)).data?.error ?? '');

const refused = (status: number, text: string): boolean =>
  refusedStatuses.has(status) || namesRefusal(text);

type Reply = Awaited<ReturnType<OAuthFlowArgo['fetch']>>;

async function refusal(reply: NonNullable<Reply>): Promise<Refreshed> {
  return refused(reply.status, await reply.text()) ? 'refused' : null;
}

async function refreshedBy(
  reply: Reply,
  path: OAuthFlowOptions['tokenPath'],
): Promise<Refreshed> {
  if (!reply) return null;

  return reply.ok ? keptIn(await reply.text(), path) : refusal(reply);
}
