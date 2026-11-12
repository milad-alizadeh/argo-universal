import {
  fixtureServices,
  type FixtureAnswer,
  type FixtureRequest,
  type FixtureServices,
} from '@argo/plugin-kit/testing';
import {
  answer,
  graphqlAnswer,
  secondToken,
  tokenOf,
} from './github-fixture-data';
import { childNumber, parentNumber } from './github-issue-nodes';

const slowRefusalMs = 1000;

const unauthorized = 401;

const forbidden = 403;

const unprocessable = 422;

// What the device flow's token endpoint answers, one reply for each poll.
type PollReply = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

export type GitHubFixture = FixtureServices & {
  // The replies the token endpoint gives from now on, in order; the last repeats.
  script: (...replies: PollReply[]) => void;
  // Every token GitHub accepts; empty means every call is a 401.
  accepted: Set<string>;
  graphqlCalls: () => FixtureRequest[];
};

const sleep = (ms: number): Promise<void> =>
  new Promise((done) => setTimeout(done, ms));

async function patch(request: FixtureRequest): Promise<FixtureAnswer> {
  if (!request.path.endsWith(`/issues/${childNumber}`))
    return answer(JSON.stringify({ number: parentNumber }));

  // Slow enough for the App to draw the new status before it rolls back.
  await sleep(slowRefusalMs);

  return answer(
    JSON.stringify({ message: 'Could not close the issue.' }),
    unprocessable,
  );
}

// Who a token signs in: the second token is another person.
const userAnswer = (request: FixtureRequest): FixtureAnswer =>
  answer(
    JSON.stringify({
      login: tokenOf(request) === secondToken ? 'hubot' : 'octocat',
    }),
  );

function api(request: FixtureRequest): FixtureAnswer | Promise<FixtureAnswer> {
  if (request.path === '/user') return userAnswer(request);

  if (request.method === 'PATCH') return patch(request);

  return answer(graphqlAnswer(request));
}

type State = { replies: PollReply[]; polled: number };

const deviceCode = (): FixtureAnswer =>
  answer(
    JSON.stringify({
      device_code: 'device-1',
      user_code: 'WDJB-MJHT',
      verification_uri: 'https://github.com/login/device',
      expires_in: 900,
      interval: 1,
    }),
  );

function tokenPoll(state: State): FixtureAnswer {
  const reply = state.replies[Math.min(state.polled, state.replies.length - 1)];

  state.polled += 1;

  return answer(JSON.stringify(reply));
}

const githubCom = (state: State, request: FixtureRequest): FixtureAnswer =>
  request.path === '/login/device/code' ? deviceCode() : tokenPoll(state);

const apiWithToken = (
  accepted: Set<string>,
  request: FixtureRequest,
): FixtureAnswer | Promise<FixtureAnswer> => {
  // GitHub's API refuses a request with no User-Agent before it looks at the token.
  if (!request.headers['user-agent'])
    return answer(
      JSON.stringify({
        message: 'Please make sure your request has a User-Agent header',
      }),
      forbidden,
    );

  return accepted.has(tokenOf(request))
    ? api(request)
    : answer(JSON.stringify({ message: 'Bad credentials' }), unauthorized);
};

const handle =
  (state: State, accepted: Set<string>) =>
  (request: FixtureRequest): FixtureAnswer | Promise<FixtureAnswer> =>
    request.host === 'github.com'
      ? githubCom(state, request)
      : apiWithToken(accepted, request);

/*
 * GitHub as the tracker meets it: the device-flow endpoints on `github.com`, and the user, GraphQL and Issue endpoints
 * on `api.github.com`, over a certificate the test trusts. A call with no User-Agent is a 403, and one with a token it does not accept a 401.
 */
export async function githubFixture(): Promise<GitHubFixture> {
  const state: State = { replies: [{ access_token: 'token-1' }], polled: 0 };
  const accepted = new Set(['token-1', 'token-2']);
  const services = await fixtureServices(handle(state, accepted));

  return {
    ...services,
    script: (...next) => {
      state.replies = next;
      state.polled = 0;
    },
    accepted,
    graphqlCalls: () =>
      services.requests.filter(({ path }) => path === '/graphql'),
  };
}
