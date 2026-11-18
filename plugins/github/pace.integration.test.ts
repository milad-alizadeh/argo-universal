import {
  fixtureServices,
  type FixtureAnswer,
  type FixtureRequest,
} from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import { journey, restart } from './journey-fixture';

const repo = 'owner/repository';

const overview = {
  drafts: { issueCount: 2 },
  viewer: { login: 'octocat' },
  repository: {
    defaultBranchRef: { name: 'trunk' },
    pullRequests: { totalCount: 4 },
  },
};

const durations = [18, 45, 90, 180, 420, 1500];

function searchAnswer(search: string): FixtureAnswer {
  const date = search.match(/merged:(\d{4}-\d{2}-\d{2})/)?.[1];
  const start = Date.parse(`${date}T00:00:00Z`);

  const nodes = durations.map((minutes, i) => {
    const merged = start + (i + 1) * 86400000;

    return {
      number: i + 1,
      title: [
        'Add repository selection',
        'Show open pull requests',
        'Draw merge trends',
        'Group PR durations',
        'Measure workflow timing',
        'Compare development weeks',
      ][i],
      author: { login: 'octocat' },
      createdAt: new Date(merged - minutes * 60000).toISOString(),
      mergedAt: new Date(merged).toISOString(),
    };
  });

  return {
    json: {
      data: {
        search: {
          issueCount: nodes.length,
          pageInfo: { hasNextPage: false },
          nodes,
        },
      },
    },
  };
}

function service(request: FixtureRequest): FixtureAnswer {
  if (request.path.includes('actions/runs?'))
    return {
      json: {
        workflow_runs: [
          {
            id: 17,
            run_attempt: 1,
            created_at: '2026-11-18T10:00:00Z',
            run_started_at: '2026-11-18T10:03:00Z',
            updated_at: '2026-11-18T10:15:00Z',
          },
        ],
      },
    };

  if (request.path.includes('/jobs?'))
    return {
      json: {
        jobs: [
          {
            name: 'Type check',
            conclusion: 'success',
            started_at: '2026-11-18T10:03:00Z',
            completed_at: '2026-11-18T10:14:00Z',
          },
        ],
      },
    };

  return graph(request);
}

function graph(request: FixtureRequest): FixtureAnswer {
  const { variables } = JSON.parse(request.body);

  return variables.search
    ? searchAnswer(variables.search)
    : { json: { data: overview } };
}

it('opens the selected repository and compares merges, authorship and CI timing across weeks', async () => {
  const run = await journey();
  const serviceFixture = await fixtureServices(service);
  run.github.network = serviceFixture.network;
  await restart(run);
  const picker = await run.test.pages.open({ path: '/pace' });
  expect(picker.findText(repo)).toBeDefined();
  const page = await picker.press(repo);
  expect(JSON.stringify(page.tree)).toContain(
    '6 of 6 merged PRs authored by octocat',
  );
  expect(JSON.stringify(page.tree)).toContain(
    '15 min average elapsed · 3 min to start',
  );
  expect(JSON.stringify(page.tree)).toContain('Type check · 11 min');
  const previous = await page.press('View previous week');
  expect(previous.findText('View current week')).toBeDefined();
  expect(
    serviceFixture.requests.some((r) =>
      r.body.includes('repo:owner/repository'),
    ),
  ).toBe(true);
}, 30000);
