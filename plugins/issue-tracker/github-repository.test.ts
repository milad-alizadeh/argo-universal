import { expect, it } from 'vitest';
import { githubRepositoryFromOrigin } from './github-repository';

it.each([
  ['git@github.com:owner/repository.git', 'owner/repository'],
  ['https://GITHUB.com/team/project.git/', 'team/project'],
  ['ssh://git@github.com/team/project.git', 'team/project'],
  ['https://gitlab.com/team/project.git', null],
  ['https://github.com/--help/project.git', null],
  ['https://github.com/team/project.git?query=1', null],
])('maps Project origin %s to GitHub repository %s', (origin, expected) => {
  expect(githubRepositoryFromOrigin(origin)).toBe(expected);
});
