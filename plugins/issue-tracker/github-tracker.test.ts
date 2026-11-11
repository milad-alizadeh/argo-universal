import type { Argo } from '@argo/plugin-kit';
import { expect, it } from 'vitest';
import { githubHost, SignInRequired } from './github-api';
import { createGitHubTracker, type TrackerClient } from './github-tracker';
import type { JsonObject } from './json';

type Fetch = Argo['fetch'];

type Sent = { url: string; init: Parameters<Fetch>[1] };

type Body = JsonObject;

const reply = (status: number, body: Body): Awaited<ReturnType<Fetch>> => ({
  ok: status < 400,
  status,
  statusText: '',
  headers: {},
  body: JSON.stringify(body),
  truncated: false,
  text: () => Promise.resolve(JSON.stringify(body)),
  json: () => Promise.resolve(body),
});

// A tracker whose every call gets one answer, and the calls it made.
type Answering = { sent: Sent[]; tracker: TrackerClient };

function trackerAnswering(answer: Awaited<ReturnType<Fetch>>): Answering {
  const sent: Sent[] = [];

  const fetch: Fetch = (url, init) => {
    sent.push({ url, init });

    return Promise.resolve(answer);
  };

  return {
    sent,
    tracker: createGitHubTracker(fetch, {
      projectId: 'project-1',
      repository: 'owner/repository',
    }),
  };
}

// The JSON a call sent, as an object.
const bodyOf = (calls: Sent[]): Body =>
  Object(JSON.parse(calls.map(({ init }) => init?.body).at(0) ?? '{}'));

const overview = {
  data: {
    repository: { labels: { nodes: [{ name: 'bug' }] } },
    count0: { issueCount: 12 },
  },
};

it('reads the labels and every count in one call, borrowing the Account for the Project', async () => {
  const { sent, tracker } = trackerAnswering(reply(200, overview));

  const read = await tracker.overview();

  expect(read.labels).toEqual(['bug']);
  expect(Object.values(read.counts)).toContain(12);
  expect(sent).toHaveLength(1);
  expect(sent[0]?.url).toBe('https://api.github.com/graphql');
  expect(sent[0]?.init).toMatchObject({
    method: 'POST',
    account: githubHost,
    projectId: 'project-1',
  });
});

it('asks to sign in when no Account answers the borrow', async () => {
  const { tracker } = trackerAnswering(null);

  await expect(tracker.overview()).rejects.toBeInstanceOf(SignInRequired);
});

it('asks to sign in again when GitHub rejects the token', async () => {
  const { tracker } = trackerAnswering(reply(401, { message: 'Bad' }));
  const asked = tracker.getIssue(8);

  await expect(asked).rejects.toBeInstanceOf(SignInRequired);
  await expect(asked).rejects.toThrow('GitHub no longer accepts this sign-in.');
});

it('says what GitHub answered when it is neither an answer nor a rejection', async () => {
  const { tracker } = trackerAnswering(reply(502, {}));

  await expect(tracker.listIssues('is:open', 30)).rejects.toThrow(
    'GitHub answered 502.',
  );
});

it('searches the repository newest first and maps the Issues', async () => {
  const issue = {
    number: 8,
    title: 'Keep the boundary',
    state: 'OPEN',
    url: 'https://github.com/owner/repository/issues/8',
  };

  const { sent, tracker } = trackerAnswering(
    reply(200, { data: { search: { nodes: [issue] } } }),
  );

  const issues = await tracker.listIssues('is:open', 30);

  expect(issues.map(({ title }) => title)).toEqual(['Keep the boundary']);
  expect(bodyOf(sent).variables).toEqual({
    query: 'repo:owner/repository is:issue is:open sort:created-desc',
    first: 30,
  });
});

it('closes an Issue as the signed-in person, and says GitHub’s own words when it refuses', async () => {
  const done = trackerAnswering(reply(200, { number: 8 }));

  await done.tracker.setStatus(8, 'closed');
  expect(done.sent[0]).toMatchObject({
    url: 'https://api.github.com/repos/owner/repository/issues/8',
    init: { method: 'PATCH', account: githubHost, projectId: 'project-1' },
  });
  expect(bodyOf(done.sent)).toEqual({
    state: 'closed',
    state_reason: 'completed',
  });

  const refused = trackerAnswering(
    reply(422, { message: 'Could not close the issue.' }),
  );

  await expect(refused.tracker.setStatus(8, 'closed')).rejects.toThrow(
    'Could not close the issue.',
  );
});
