import type {
  OAuthFlowArgo,
  OAuthFlowOptions,
  OAuthFlowState,
} from '@repo/contracts/plugins/oauth-flow-api';
import { z } from 'zod';

// What Argo's redirect answered when it started listening, with the client ID the sign-in read.
export type Waiting = NonNullable<
  Awaited<ReturnType<OAuthFlowArgo['oauth']['start']>>
> & { clientId: string };

// A waiting sign-in once the browser answered with its code.
export type Grant = Waiting & { code: string; verifier: string };

type Request = NonNullable<Parameters<OAuthFlowArgo['fetch']>[1]>;

export const failed = (message: string): OAuthFlowState => ({
  kind: 'failed',
  reason: 'failed',
  message,
});

const form = (fields: Record<string, string>): string =>
  Object.entries(fields)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

export function authorizeLocation(
  options: OAuthFlowOptions,
  start: Waiting,
): string {
  const scope = options.scopes?.join(' ');

  return `${options.authorizeUrl}?${form({
    response_type: 'code',
    client_id: start.clientId,
    redirect_uri: start.redirectUri,
    state: start.state,
    code_challenge: start.codeChallenge,
    code_challenge_method: start.codeChallengeMethod,
    ...(scope && { scope }),
  })}`;
}

// Argo mints the Account id; the token lives in the Plugin's own secrets under it.
export async function signedIn(
  argo: OAuthFlowArgo,
  options: OAuthFlowOptions,
  grant: Grant,
): Promise<OAuthFlowState> {
  const token = await exchange(argo, options, grant);

  if (!token) return failed('The service did not return a token.');

  const label = await options.label(token);

  if (!label) return failed('The service did not say who signed in.');

  const id = await argo.accounts.add(options.host, { label });

  await argo.secrets.set(id, token);

  return { kind: 'signed-in', label };
}

// The Plugin exchanges the code itself, as a public client with its PKCE verifier (RFC 6749, RFC 7636).
async function exchange(
  argo: OAuthFlowArgo,
  options: OAuthFlowOptions,
  grant: Grant,
): Promise<string | null> {
  const response = await argo.fetch(options.tokenUrl, tokenRequest(grant));

  return response?.ok
    ? tokenIn(await response.text(), options.tokenPath)
    : null;
}

const tokenRequest = (grant: Grant): Request => ({
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded',
  },
  body: form({
    grant_type: 'authorization_code',
    client_id: grant.clientId,
    code: grant.code,
    code_verifier: grant.verifier,
    redirect_uri: grant.redirectUri,
  }),
});

// The token at `path` in the endpoint's JSON answer, or null for anything else, an answer that is not JSON too.
function tokenIn(
  text: string,
  path: readonly string[] = ['access_token'],
): string | null {
  const token = path.reduceRight<z.ZodType<string>>(
    (inner, key) =>
      z
        .object({ [key]: inner })
        .transform((at) => at[key])
        .pipe(z.string()),
    z.string().min(1),
  );

  return token.safeParse(parsed(text)).data ?? null;
}

const parsed = (text: string): ReturnType<typeof JSON.parse> => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
