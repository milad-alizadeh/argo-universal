import {
  fixtureServices,
  type FixtureAnswer,
  type FixtureRequest,
} from './fixture-services';
import type { PluginTestOptions } from './test-types';

export const itemsText = 'the items';

const unauthorized = 401;

export type ServiceFixture = {
  requests: Awaited<ReturnType<typeof fixtureServices>>['requests'];
  // The tokens the service accepts; a test clears one to revoke it.
  accepted: Set<string>;
  // Who the service says is signing in; a test changes it for a sign-in as someone else.
  person: { login: string };
  // Set to make every token it issues run out, with a refresh token.
  expiresIn: { seconds: number | null };
  // `pending` while the person has not approved the code, so polling keeps waiting; `lifetime` is how long a code lasts.
  approval: { pending: boolean; lifetime: number };
  // Bodies of the token endpoint's requests.
  tokenBodies: () => URLSearchParams[];
  // The bearer token of the reads that reached `/items`.
  readTokens: () => string[];
};

const tokenOf = (authorization = ''): string =>
  authorization.replace(/^Bearer /, '');

const refusal = { status: unauthorized, json: { message: 'Bad token' } };

const expiring = (
  seconds: number | null,
  access: string,
): Record<string, string | number> =>
  seconds === null
    ? {}
    : { expires_in: seconds, refresh_token: `refresh-${access}` };

function tokenReply(
  fixture: Pick<ServiceFixture, 'accepted' | 'expiresIn'>,
  number: number,
): FixtureAnswer {
  const access = `token-${number}`;

  fixture.accepted.add(access);

  return {
    json: {
      access_token: access,
      ...expiring(fixture.expiresIn.seconds, access),
    },
  };
}

const deviceReply = ({
  lifetime,
}: ServiceFixture['approval']): FixtureAnswer => ({
  json: {
    device_code: 'device-code',
    user_code: 'WDJB-MJHT',
    verification_uri: 'https://auth.service.example/activate',
    interval: 5,
    expires_in: lifetime,
  },
});

type Requests = ServiceFixture['requests'];

const reachedPath = (requests: Requests, wanted: string): Requests =>
  requests.filter(({ path }) => path === wanted);

// What a read answers: who signed in on `/me`, and the items anywhere else.
function readReply(
  state: Pick<ServiceFixture, 'accepted' | 'person'>,
  { path, headers }: Pick<FixtureRequest, 'path' | 'headers'>,
): FixtureAnswer {
  const token = tokenOf(headers.authorization);

  if (!state.accepted.has(token)) return refusal;

  return path === '/me'
    ? { json: { login: state.person.login } }
    : { text: itemsText };
}

type ServiceState = Pick<
  ServiceFixture,
  'accepted' | 'person' | 'expiresIn' | 'approval'
>;

const stillPending: FixtureAnswer = {
  status: 400,
  json: { error: 'authorization_pending' },
};

function tokenAnswerer(state: ServiceState): () => FixtureAnswer {
  let issued = 0;

  return () => {
    if (state.approval.pending) return stillPending;

    issued += 1;

    return tokenReply(state, issued);
  };
}

function answerer(state: ServiceState): Parameters<typeof fixtureServices>[0] {
  const token = tokenAnswerer(state);

  return (request) => {
    if (request.path === '/device') return deviceReply(state.approval);

    return request.path === '/token' ? token() : readReply(state, request);
  };
}

const bodiesOf = (requests: Requests): URLSearchParams[] =>
  reachedPath(requests, '/token').map(({ body }) => new URLSearchParams(body));

const readTokensOf = (requests: Requests): string[] =>
  reachedPath(requests, '/items').map(({ headers }) =>
    tokenOf(headers.authorization),
  );

const emptyState = (): ServiceState => ({
  accepted: new Set(),
  person: { login: 'person-1' },
  expiresIn: { seconds: null },
  approval: { pending: false, lifetime: 900 },
});

// One service with every endpoint a sign-in reaches: the Account's reads on its API host, and the OAuth ones.
export async function serviceFixture(): Promise<
  ServiceFixture & Pick<PluginTestOptions, 'network'>
> {
  const state = emptyState();
  const { network, requests } = await fixtureServices(answerer(state));

  return {
    ...state,
    network,
    requests,
    tokenBodies: () => bodiesOf(requests),
    readTokens: () => readTokensOf(requests),
  };
}
