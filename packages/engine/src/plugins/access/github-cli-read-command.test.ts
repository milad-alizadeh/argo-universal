import { expect, it } from 'vitest';
import { checkGitHubCliRead } from './github-cli-read-command';

const command = [
  'gh',
  'api',
  '--hostname',
  'github.com',
  '--method',
  'GET',
  '--include',
  '--',
];

it.each([
  'repos/owner/repository',
  'repos/owner/repository/pulls?head=owner%3Afeature-12&state=all',
  'repos/owner/repository/pulls/12/files',
  'repos/owner/repository/pulls?head=owner%3Afix(example)!&state=all',
  'repos/owner/repository/commits/abcdef0/check-runs?per_page=100',
])('allows the fixed read command for %s', (endpoint) => {
  expect(() => checkGitHubCliRead([...command, endpoint])).not.toThrow();
});

it.each([
  'https://other.example/repos/owner/repository',
  '--input=/tmp/file',
  'repos/owner/repository/../../user',
  'repos/owner/../pulls',
  'repos/owner/repository/issues',
  'graphql',
])('refuses the fixed read command for %s', (endpoint) => {
  expect(() => checkGitHubCliRead([...command, endpoint])).toThrow(
    'This GitHub CLI command must read a repository, pull request or Checks.',
  );
});
