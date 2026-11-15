import type { PluginNetwork } from '@repo/engine/plugins';
import {
  fixtureServices,
  type FixtureAnswer,
  type FixtureRequest,
} from './fixture-services';
import { itemsText } from './sign-in-fixture';

export const clientSecret = 'fixture-client-secret-5e1d';

const oneHourSeconds = 3600;

const msPerSecond = 1000;

export const oneHourMs = oneHourSeconds * msPerSecond;

type Issued = { access: string; refresh: string };

// What the service has handed out: the one pair still good, and how many it has issued.
type Ledger = { issued: number; live: Issued | null };

export type RotatingService = {
  network: PluginNetwork;
  // The token endpoint's forms, every one, and the refreshes among them.
  forms: () => URLSearchParams[];
  refreshes: () => URLSearchParams[];
  // The `Authorization` header of each read that reached `/items`.
  reads: () => (string | undefined)[];
  // Revokes the live refresh token, as the person revoking the app or 90 days unused would.
  revoke: () => void;
};

function issue(ledger: Ledger): FixtureAnswer {
  ledger.issued += 1;
  const { issued } = ledger;

  ledger.live = { access: `token-${issued}`, refresh: `refresh-${issued}` };

  return {
    json: {
      access_token: ledger.live.access,
      refresh_token: ledger.live.refresh,
      expires_in: oneHourSeconds,
      token_type: 'Bearer',
    },
  };
}

// A careless service that quotes the secret it was sent, so the test can see Argo never repeats it.
const invalidClient = (form: URLSearchParams): FixtureAnswer => ({
  status: 401,
  json: {
    error: 'invalid_client',
    error_description: `Unknown secret ${form.get('client_secret')}`,
  },
});

const invalidGrant: FixtureAnswer = {
  status: 400,
  json: { error: 'invalid_grant' },
};

const spendable = (ledger: Ledger, form: URLSearchParams): boolean =>
  form.get('grant_type') === 'authorization_code' ||
  form.get('refresh_token') === ledger.live?.refresh;

function token(ledger: Ledger, form: URLSearchParams): FixtureAnswer {
  if (form.get('client_secret') !== clientSecret) return invalidClient(form);

  return spendable(ledger, form) ? issue(ledger) : invalidGrant;
}

const read = (ledger: Ledger, { headers }: FixtureRequest): FixtureAnswer =>
  headers.authorization === `Bearer ${ledger.live?.access}`
    ? { text: itemsText }
    : { status: 401, json: { message: 'Bad token' } };

const formsOf = (requests: FixtureRequest[]): URLSearchParams[] =>
  requests.flatMap(({ path, body }) =>
    path === '/token' ? [new URLSearchParams(body)] : [],
  );

const readsOf = (requests: FixtureRequest[]): (string | undefined)[] =>
  requests.flatMap(({ path, headers }) =>
    path === '/items' ? [headers.authorization] : [],
  );

const revoking = (ledger: Ledger) => (): void => {
  if (ledger.live) ledger.live = { ...ledger.live, refresh: 'revoked' };
};

const isRefresh = (form: URLSearchParams): boolean =>
  form.get('grant_type') === 'refresh_token';

/*
 * A service like Atlassian's: every exchange and refresh needs the client secret, each refresh rotates the refresh
 * token, and a refresh token already spent, or revoked, is refused with `invalid_grant`.
 */
export async function rotatingService(): Promise<RotatingService> {
  const ledger: Ledger = { issued: 0, live: null };

  const { network, requests } = await fixtureServices((request) =>
    request.path === '/token'
      ? token(ledger, new URLSearchParams(request.body))
      : read(ledger, request),
  );

  return {
    network,
    forms: () => formsOf(requests),
    refreshes: () => formsOf(requests).filter(isRefresh),
    reads: () => readsOf(requests),
    revoke: revoking(ledger),
  };
}
