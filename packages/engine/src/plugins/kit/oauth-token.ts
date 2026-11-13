import type {
  OAuthFlowArgo,
  OAuthFlowOptions,
} from '@repo/contracts/plugins/oauth-flow-api';
import { z } from 'zod';
import { form } from './form-body';
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
const Beside = z.object({
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().nonnegative().optional(),
});

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

  const beside = Beside.catch({}).parse(objectAt(answer, path.slice(0, -1)));

  return {
    access,
    refresh: beside.refresh_token,
    expiresAtMs: expiresAtMsOf(beside.expires_in),
  };
}

// The client ID as a sign-in or a refresh reads it: given, or read from where the Plugin keeps it.
export async function clientIdOf(
  options: OAuthFlowOptions,
): Promise<string | null> {
  const { clientId } = options;
  const value = typeof clientId === 'function' ? await clientId() : clientId;

  return value || null;
}

const refreshRequest = (
  clientId: string,
  refresh: string,
): NonNullable<Parameters<OAuthFlowArgo['fetch']>[1]> => ({
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded',
  },
  body: form({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refresh,
  }),
});

// RFC 6749 section 6, as the public client the sign-in was: the client ID and the refresh token, no client secret.
export const oauthRefresh =
  (fetch: OAuthFlowArgo['fetch'], options: OAuthFlowOptions): Refresh =>
  async (refresh) => {
    const clientId = await clientIdOf(options);

    if (!clientId) return null;

    const reply = await fetch(
      options.tokenUrl,
      refreshRequest(clientId, refresh),
    );

    return keptFrom(reply, options.tokenPath);
  };

// A refusal, or no answer at all, gives no token.
async function keptFrom(
  reply: Awaited<ReturnType<OAuthFlowArgo['fetch']>>,
  path: OAuthFlowOptions['tokenPath'],
): Promise<KeptToken | null> {
  return reply?.ok ? keptIn(await reply.text(), path) : null;
}
