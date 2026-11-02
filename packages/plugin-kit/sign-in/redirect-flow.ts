import type { Argo } from '@argo/plugin-kit';
import type { Settled } from './device-poll';
import {
  form,
  postForm,
  text,
  withScope,
  type Fields,
  type Reply,
} from './reply';
import { failed, unfinished, type FlowRun } from './steps';
import { tokensOf } from './tokens';

export type RedirectClient = {
  name: string;
  clientId: string;
  scope?: string;
  authorizeUrl: string;
  tokenUrl: string;
};

type Calls = Pick<Argo, 'fetch' | 'oauth'>;

type Start = NonNullable<Awaited<ReturnType<Argo['oauth']['start']>>>;

const authorizeLocation = (client: RedirectClient, start: Start): string => {
  const fields = {
    response_type: 'code',
    client_id: client.clientId,
    redirect_uri: start.redirectUri,
    state: start.state,
    code_challenge: start.codeChallenge,
    code_challenge_method: start.codeChallengeMethod,
  };

  return `${client.authorizeUrl}?${form(withScope(fields, client.scope))}`;
};

type Grant = { code: string; verifier: string; redirectUri: string };

const exchangeFields = (
  { clientId }: RedirectClient,
  { code, verifier, redirectUri }: Grant,
): Fields => ({
  grant_type: 'authorization_code',
  client_id: clientId,
  code,
  code_verifier: verifier,
  redirect_uri: redirectUri,
});

function exchanged(client: RedirectClient, reply: Reply): Settled {
  const tokens = tokensOf(reply);

  if (tokens) return { kind: 'token', tokens };

  return failed(
    text(reply, 'error_description') ??
      `${client.name} did not return a token.`,
  );
}

// The Plugin exchanges the code itself (ADR-0036). PKCE stands in for a secret, so a service that demands one is not this flow's.
async function exchange(
  { fetch }: Calls,
  client: RedirectClient,
  grant: Grant,
): Promise<Settled> {
  const target = { url: client.tokenUrl, name: client.name };
  const reply = await postForm(fetch, target, exchangeFields(client, grant));

  return exchanged(client, reply);
}

/*
 * The redirect flow with PKCE: Argo runs the browser and the listener on the Server Device and hands back the code. A
 * denial, its five-minute timeout and a reload all answer nothing, so the page cannot tell them apart and need not.
 */
export async function runRedirectFlow(
  calls: Calls,
  client: RedirectClient,
  run: FlowRun,
): Promise<Settled> {
  const start = await calls.oauth.start();

  if (!start) return failed('Couldn’t start sign-in.');

  run.show({ kind: 'browser' });

  const location = authorizeLocation(client, start);
  const result = await calls.oauth.await(start.state, location);

  if (!result) return unfinished(client.name);

  return exchange(calls, client, { ...result, redirectUri: start.redirectUri });
}
