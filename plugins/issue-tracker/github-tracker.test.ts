import { expect, it } from 'vitest';
import { githubHost, SignInRequired } from './github-api';
import { bodyOf, reply, trackerAnswering } from './tracker-answering';

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

const issueNode = () => ({
  number: 8,
  title: 'Keep the boundary',
  state: 'OPEN',
  url: 'https://github.com/owner/repository/issues/8',
});

it('searches the repository newest first and maps the Issues', async () => {
  const { sent, tracker } = trackerAnswering(
    reply(200, { data: { search: { nodes: [issueNode()] } } }),
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

it('leaves a filter without a count when GitHub does not report it, and rejects a label list it does not send', async () => {
  const missing = trackerAnswering(
    reply(200, {
      data: { repository: { labels: { nodes: [{ name: 'bug' }] } } },
    }),
  );

  expect((await missing.tracker.overview()).counts).toEqual({});

  const invalid = trackerAnswering(reply(200, { data: { repository: {} } }));

  await expect(invalid.tracker.overview()).rejects.toThrow(
    'GitHub returned an invalid label list.',
  );
});

it('skips a search node that is no Issue, and rejects a node with some of an Issue only', async () => {
  const skipped = trackerAnswering(
    reply(200, { data: { search: { nodes: [{}, issueNode()] } } }),
  );

  expect(
    (await skipped.tracker.listIssues('is:open', 30)).map(
      ({ number }) => number,
    ),
  ).toEqual([8]);

  const malformed = trackerAnswering(
    reply(200, { data: { search: { nodes: [{ number: 9 }, issueNode()] } } }),
  );

  await expect(malformed.tracker.listIssues('is:open', 30)).rejects.toThrow(
    'GitHub returned an invalid Issue.',
  );
});
