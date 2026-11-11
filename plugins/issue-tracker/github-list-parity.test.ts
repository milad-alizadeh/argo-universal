import { expect, it } from 'vitest';
import { bodyOf, reply, trackerAnswering } from './tracker-answering';

const fullIssue = {
  number: 8,
  title: 'Keep the boundary',
  state: 'OPEN',
  url: 'https://github.com/owner/repository/issues/8',
  body: 'The description.',
  labels: { nodes: [{ name: 'bug', color: 'd73a4a' }] },
  assignees: { nodes: [{ login: 'octocat' }] },
  parent: { number: 3 },
  blockedBy: {
    nodes: [
      {
        number: 5,
        title: 'Blocker',
        state: 'OPEN',
        url: 'https://github.com/owner/repository/issues/5',
      },
    ],
  },
  subIssues: {
    nodes: [
      {
        number: 9,
        title: 'Child',
        state: 'CLOSED',
        url: 'https://github.com/owner/repository/issues/9',
      },
    ],
  },
  subIssuesSummary: { completed: 1, total: 1 },
  createdAt: '2026-11-01T00:00:00Z',
};

it('lists each Issue with the fields its own page reads, so one opened from a row is never cut short', async () => {
  const listed = trackerAnswering(
    reply(200, { data: { search: { nodes: [fullIssue] } } }),
  );

  const single = trackerAnswering(
    reply(200, { data: { repository: { issue: fullIssue } } }),
  );

  const [fromList] = await listed.tracker.listIssues('is:open', 30);

  expect(fromList).toEqual(await single.tracker.getIssue(8));
  expect(fromList).toMatchObject({
    body: 'The description.',
    blockedBy: [{ number: 5 }],
    children: [{ number: 9 }],
  });

  // The list asks GitHub for the same fields the page's own read does.
  for (const field of ['body', 'blockedBy', 'subIssues'])
    expect(String(bodyOf(listed.sent).query)).toContain(field);
});
