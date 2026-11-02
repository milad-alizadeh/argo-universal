import {
  fixtureServices,
  type FixtureAnswer,
  type FixtureRequest,
  type FixtureServices,
} from '@argo/plugin-kit/testing';

// Issue 43 is a sub-Issue of 42 and blocked by it. GitHub refuses to change issue 43's status. Closed searches find nothing.
const url = (number: number): string =>
  `https://github.com/owner/repository/issues/${number}`;

const relation = (number: number, title: string): object => ({
  number,
  title,
  state: 'OPEN',
  url: url(number),
});

const parentTitle = 'Fixture issue from GitHub';

export const refusedTitle = 'Fixture issue GitHub cannot change';

const issue = (number: number, title: string, extra: object): object => ({
  number,
  title,
  state: 'OPEN',
  stateReason: null,
  url: url(number),
  labels: { nodes: [{ name: 'fixture', color: 'd73a4a' }] },
  assignees: { nodes: [{ login: 'octocat' }] },
  parent: null,
  ...extra,
});

const issue42 = (): object =>
  issue(42, parentTitle, {
    blockedBy: { nodes: [] },
    subIssues: { nodes: [relation(43, refusedTitle)] },
    subIssuesSummary: { completed: 0, total: 1 },
    body: 'This Issue came from the fixture GitHub.',
  });

const issue43 = (): object =>
  issue(43, refusedTitle, {
    parent: { number: 42 },
    blockedBy: { nodes: [relation(42, parentTitle)] },
    subIssues: { nodes: [] },
    subIssuesSummary: { completed: 0, total: 0 },
    body: 'This Issue came from the fixture GitHub.',
  });

// What the device flow's token endpoint answers, one reply for each poll.
export type PollReply = Record<string, unknown>;

export type GitHubFixture = FixtureServices & {
  // The replies the token endpoint gives from now on, in order; the last repeats.
  script: (...replies: PollReply[]) => void;
  // Every token GitHub accepts; empty means every call is a 401.
  accepted: Set<string>;
  graphqlCalls: () => FixtureRequest[];
};

const json = (body: unknown, status = 200): FixtureAnswer => ({
  status,
  json: body,
});

const variablesOf = (request: FixtureRequest): Record<string, string> => {
  const { variables } = JSON.parse(request.body);

  return variables ?? {};
};

function overviewData(variables: Record<string, string>): object {
  const counts = Object.entries(variables)
    .filter(([key]) => key.startsWith('count'))
    .map(([key, query]) => [
      key,
      { issueCount: query.includes('is:closed') ? 0 : 2 },
    ]);

  return {
    repository: {
      labels: { nodes: [{ name: 'fixture' }, { name: 'good first issue' }] },
    },
    ...Object.fromEntries(counts),
  };
}

function graphqlData(request: FixtureRequest): object {
  const { query } = JSON.parse(request.body);
  const variables = variablesOf(request);

  if ('count0' in variables) return overviewData(variables);

  if (String(query).includes('issue(number:'))
    return {
      repository: {
        issue: Number(variables.number) === 43 ? issue43() : issue42(),
      },
    };

  const closed = String(variables.query).includes('is:closed');

  return { search: { nodes: closed ? [] : [issue42(), issue43()] } };
}

function tokenOf(request: FixtureRequest): string {
  return String(request.headers.authorization ?? '').replace('Bearer ', '');
}

const sleep = (ms: number): Promise<void> =>
  new Promise((done) => setTimeout(done, ms));

async function patch(request: FixtureRequest): Promise<FixtureAnswer> {
  if (!request.path.endsWith('/issues/43')) return json({ number: 42 });

  // Slow enough for the App to draw the new status before it rolls back.
  await sleep(1000);

  return json({ message: 'Could not close the issue.' }, 422);
}

/*
 * GitHub as the tracker meets it: the device-flow endpoints on `github.com`, and the user, GraphQL and Issue endpoints
 * on `api.github.com`, over a certificate the test trusts. A call with a token it does not accept is a 401.
 */
export async function githubFixture(): Promise<GitHubFixture> {
  let replies: PollReply[] = [{ access_token: 'token-1' }];

  const accepted = new Set(['token-1', 'token-2']);
  let polled = 0;

  const services = await fixtureServices(async (request) => {
    if (request.host === 'github.com') {
      if (request.path === '/login/device/code')
        return json({
          device_code: 'device-1',
          user_code: 'WDJB-MJHT',
          verification_uri: 'https://github.com/login/device',
          expires_in: 900,
          interval: 1,
        });

      const reply = replies[Math.min(polled, replies.length - 1)];
      polled += 1;

      return json(reply);
    }

    if (!accepted.has(tokenOf(request)))
      return json({ message: 'Bad credentials' }, 401);

    if (request.path === '/user') return json({ login: 'octocat' });

    if (request.method === 'PATCH') return patch(request);

    return json({ data: graphqlData(request) });
  });

  return {
    ...services,
    script: (...next) => {
      replies = next;
      polled = 0;
    },
    accepted,
    graphqlCalls: () =>
      services.requests.filter(({ path }) => path === '/graphql'),
  };
}
