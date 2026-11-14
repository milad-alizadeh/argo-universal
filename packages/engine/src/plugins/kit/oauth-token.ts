import type {
  OAuthFlowArgo,
  OAuthFlowOptions,
} from '@repo/contracts/plugins/oauth-flow-api';
import { z } from 'zod';
import { formPost } from './form-body';
import { expiresAtMsOf, type KeptToken, type Refresh } from './kept-token';

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

// The client ID as a sign-in or a refresh reads it: given, or read from where the Plugin keeps it.
export async function clientIdOf(
  options: OAuthFlowOptions,
): Promise<string | null> {
  const { clientId } = options;
  const value = typeof clientId === 'function' ? await clientId() : clientId;

  return value || null;
}

// RFC 6749 section 6, as the public client the sign-in was: the client ID and the refresh token, no client secret.
export const oauthRefresh =
  (fetch: OAuthFlowArgo['fetch'], options: OAuthFlowOptions): Refresh =>
  async (refresh) => {
    const clientId = await clientIdOf(options);

    if (!clientId) return null;

    const reply = await fetch(
      options.tokenUrl,
      formPost({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: refresh,
      }),
    );

    return keptFromReply(reply, options.tokenPath);
  };

// A refusal, or no answer at all, gives no token.
async function keptFromReply(
  reply: Awaited<ReturnType<OAuthFlowArgo['fetch']>>,
  path: OAuthFlowOptions['tokenPath'],
): Promise<KeptToken | null> {
  return reply?.ok ? keptIn(await reply.text(), path) : null;
}
