import {
  fixtureServices,
  type FixtureAnswer,
  type FixtureRequest,
  type FixtureServices,
} from '@argo/plugin-kit/testing';
import {
  childIssue,
  childNumber,
  parentIssue,
  parentNumber,
} from './github-issue-nodes';
import { isObject, parseJson, pick, type Json, type JsonObject } from './json';

const slowRefusalMs = 1000;

const unauthorized = 401;

const unprocessable = 422;

const textOf = (value: Json | undefined): string =>
  typeof value === 'string' ? value : '';

// What the device flow's token endpoint answers, one reply for each poll.
export type PollReply = {
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

const answer = (body: string, status?: number): FixtureAnswer => ({
  status,
  text: body,
});

const variablesOf = (body: Json): JsonObject => {
  const variables = pick(body, 'variables');

  return isObject(variables) ? variables : {};
};

const overviewData = (variables: JsonObject): string =>
  JSON.stringify({
    repository: {
      labels: { nodes: [{ name: 'fixture' }, { name: 'good first issue' }] },
    },
    ...Object.fromEntries(
      Object.entries(variables).flatMap(([key, query]) =>
        key.startsWith('count')
          ? [[key, { issueCount: textOf(query).includes('is:closed') ? 0 : 2 }]]
          : [],
      ),
    ),
  });

const issueData = (variables: JsonObject): string =>
  JSON.stringify({
    repository: {
      issue:
        Number(variables.number) === childNumber ? childIssue() : parentIssue(),
    },
  });

const searchData = (variables: JsonObject): string => {
  const closed = textOf(variables.query).includes('is:closed');

  return JSON.stringify({
    search: { nodes: closed ? [] : [parentIssue(), childIssue()] },
  });
};

function dataOf(request: FixtureRequest): string {
  const body = parseJson(request.body);
  const variables = variablesOf(body);

  if ('count0' in variables) return overviewData(variables);

  if (textOf(pick(body, 'query')).includes('issue(number:'))
    return issueData(variables);

  return searchData(variables);
}

const tokenOf = (request: FixtureRequest): string =>
  String(request.headers.authorization ?? '').replace('Bearer ', '');

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

function api(request: FixtureRequest): FixtureAnswer | Promise<FixtureAnswer> {
  if (request.path === '/user')
    return answer(JSON.stringify({ login: 'octocat' }));

  if (request.method === 'PATCH') return patch(request);

  return answer(`{"data":${dataOf(request)}}`);
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
): FixtureAnswer | Promise<FixtureAnswer> =>
  accepted.has(tokenOf(request))
    ? api(request)
    : answer(JSON.stringify({ message: 'Bad credentials' }), unauthorized);

const handle =
  (state: State, accepted: Set<string>) =>
  (request: FixtureRequest): FixtureAnswer | Promise<FixtureAnswer> =>
    request.host === 'github.com'
      ? githubCom(state, request)
      : apiWithToken(accepted, request);

/*
 * GitHub as the tracker meets it: the device-flow endpoints on `github.com`, and the user, GraphQL and Issue endpoints
 * on `api.github.com`, over a certificate the test trusts. A call with a token it does not accept is a 401.
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
