import type {
  OAuthFlowArgo,
  OAuthFlowOptions,
  OAuthFlowState,
} from '@repo/contracts/plugins/oauth-flow-api';
import { z } from 'zod';
import { oneLine } from '../runtime/render-fallback';
import { form, formPost } from './form-body';
import { secretOf, type KeptToken } from './kept-token';
import { keptIn, parsed } from './oauth-token';

// What Argo's redirect answered when it started listening, with the client ID the sign-in read.
export type Waiting = NonNullable<
  Awaited<ReturnType<OAuthFlowArgo['oauth']['start']>>
> & { clientId: string };

// A waiting sign-in once the browser answered with its code.
export type Grant = Waiting & { code: string; verifier: string };

type TokenRequest = NonNullable<Parameters<OAuthFlowArgo['fetch']>[1]>;

export const failed = (message: string): OAuthFlowState => ({
  kind: 'failed',
  reason: 'failed',
  message,
});

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
  const exchanged = await exchange(argo, options, grant);

  if (exchanged.problem !== undefined) return failed(exchanged.problem);

  const { token } = exchanged;
  const label = await options.label(token.access);

  if (!label) return failed('The service did not say who signed in.');

  const id = await argo.accounts.add(options.host, { label });

  await argo.secrets.set(id, secretOf(token));

  return { kind: 'signed-in', label };
}

// The token the service gave, or why it gave none.
type Exchanged =
  | { token: KeptToken; problem?: never }
  | { token?: never; problem: string };

// The Plugin exchanges the code itself, as a public client with its PKCE verifier (RFC 6749, RFC 7636).
async function exchange(
  argo: OAuthFlowArgo,
  options: OAuthFlowOptions,
  grant: Grant,
): Promise<Exchanged> {
  const response = await argo.fetch(options.tokenUrl, tokenRequest(grant));

  return response
    ? answered(response, options.tokenPath)
    : { problem: 'The service did not answer.' };
}

async function answered(
  response: NonNullable<Awaited<ReturnType<OAuthFlowArgo['fetch']>>>,
  path: OAuthFlowOptions['tokenPath'],
): Promise<Exchanged> {
  const text = await response.text();
  const token = response.ok ? keptIn(text, path) : null;

  return token === null
    ? { problem: refusal(response.status, text) }
    : { token };
}

const tokenRequest = (grant: Grant): TokenRequest =>
  formPost({
    grant_type: 'authorization_code',
    client_id: grant.clientId,
    code: grant.code,
    code_verifier: grant.verifier,
    redirect_uri: grant.redirectUri,
  });

const maxReason = 200;

/*
 * Why the service gave no token, in the words it used: its `error` and `error_description` (RFC 6749 section
 * 5.2) on one line and capped, since the person reads it and the log may keep it.
 */
function refusal(status: number, text: string): string {
  const reason = reasonIn(text);

  return reason === ''
    ? `The service did not return a token (${status}).`
    : `The service refused the sign-in (${status}): ${reason}`;
}

const noReason: z.infer<typeof ServiceError> = {};

function reasonIn(text: string): string {
  const said = ServiceError.safeParse(parsed(text)).data ?? noReason;

  const reason = [said.error, said.error_description]
    .filter((part) => part !== undefined)
    .join(', ');

  return oneLine(reason).slice(0, maxReason);
}

const ServiceError = z.object({
  error: z.string().optional(),
  error_description: z.string().optional(),
});
