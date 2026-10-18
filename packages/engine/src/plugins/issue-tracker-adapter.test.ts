import { expect, it } from 'vitest';
import { createGitHubTracker } from '../../../../plugins/issue-tracker/github-tracker.js';

const issueTitle = 'Keep the Plugin boundary';

const repository = 'argo/app';

it('runs GitHub issue operations through the Plugin argo process API', async () => {
  const calls: string[][] = [];

  const tracker = createGitHubTracker({
    process: {
      run: async (argv: string[]) => {
        calls.push(argv);

        if (argv[2] === 'list')
          return {
            exitCode: 0,
            stdout: JSON.stringify([
              {
                number: 8,
                title: issueTitle,
                state: 'OPEN',
                url: `https://github.com/${repository}/issues/8`,
                labels: [{ name: 'security' }],
                assignees: [{ login: 'dev' }],
              },
            ]),
            stderr: '',
            truncated: false,
            timedOut: false,
          };

        if (argv[2] === 'view')
          return {
            exitCode: 0,
            stdout: JSON.stringify({
              number: 8,
              title: issueTitle,
              state: 'CLOSED',
              body: 'Use the Server API.',
              url: `https://github.com/${repository}/issues/8`,
              labels: [{ name: 'security' }],
              assignees: [{ login: 'dev' }],
            }),
            stderr: '',
            truncated: false,
            timedOut: false,
          };

        return {
          exitCode: 0,
          stdout: '',
          stderr: '',
          truncated: false,
          timedOut: false,
        };
      },
    },
  });

  await tracker.authStatus();
  expect(await tracker.listIssues({ repository })).toEqual([
    {
      number: 8,
      title: issueTitle,
      status: 'open',
      body: '',
      url: `https://github.com/${repository}/issues/8`,
      labels: ['security'],
      assignees: ['dev'],
    },
  ]);
  expect(await tracker.getIssue({ repository, number: 8 })).toEqual({
    number: 8,
    title: issueTitle,
    status: 'closed',
    body: 'Use the Server API.',
    url: `https://github.com/${repository}/issues/8`,
    labels: ['security'],
    assignees: ['dev'],
  });
  await tracker.setStatus({
    repository,
    number: 8,
    status: 'open',
  });
  await tracker.setStatus({
    repository,
    number: 8,
    status: 'closed',
  });

  expect(calls).toEqual([
    ['gh', 'auth', 'status'],
    [
      'gh',
      'issue',
      'list',
      '--repo',
      repository,
      '--state',
      'all',
      '--limit',
      '50',
      '--json',
      'number,title,state,labels,assignees,url',
    ],
    [
      'gh',
      'issue',
      'view',
      '8',
      '--repo',
      repository,
      '--json',
      'number,title,state,labels,assignees,url,body',
    ],
    ['gh', 'issue', 'reopen', '8', '--repo', repository],
    ['gh', 'issue', 'close', '8', '--repo', repository],
  ]);
});

it('reports a failed gh command with its stderr', async () => {
  const tracker = createGitHubTracker({
    process: {
      run: async () => ({
        exitCode: 1,
        stdout: '',
        stderr: 'gh: not found',
        truncated: false,
        timedOut: false,
      }),
    },
  });

  await expect(tracker.authStatus()).rejects.toThrow('gh: not found');
});

it('rejects timed out and truncated gh output before parsing it', async () => {
  for (const result of [
    { timedOut: true, truncated: false, expected: 'timed out' },
    { timedOut: false, truncated: true, expected: 'exceeded the output cap' },
  ]) {
    const tracker = createGitHubTracker({
      process: {
        run: async () => ({
          exitCode: 0,
          stdout: '[]',
          stderr: '',
          truncated: result.truncated,
          timedOut: result.timedOut,
        }),
      },
    });

    await expect(tracker.listIssues({ repository })).rejects.toThrow(
      result.expected,
    );
  }
});
