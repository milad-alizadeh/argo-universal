import { expect } from 'vitest';
import { reference, repository } from './auto-merge-fixture';
import { sha } from './github-fixture';
import type { FixtureComment } from './github-fixture-types';
import { project, type Journey } from './journey-fixture';
import { promptsSent } from './journey-prompts-fixture';
import { shortHead } from './pull-reads';

const failing = (
  ...names: string[]
): { name: string; status: 'completed'; conclusion: 'failure' }[] =>
  names.map((name) => ({
    name,
    status: 'completed' as const,
    conclusion: 'failure' as const,
  }));

// Makes these Checks fail on a head commit of the fixture GitHub.
export const failChecks = (
  run: Journey,
  head: string,
  ...names: string[]
): void => {
  run.github.checks.set(`${repository}@${head}`, failing(...names));
};

// The Watch's runs that finished for the journey's own Project; another Project's run says nothing of its turn.
const completed = async (run: Journey): Promise<number> =>
  (await run.test.log())
    .split('\n')
    .filter((line) => line.includes(`watch completed (Project ${project.id})`))
    .length;

const watchIntervalMs = 60_000;

// What the Plugin is already doing has finished, such as the Watch it runs as it starts, so it is not taken for the next.
const settled = async (run: Journey): Promise<void> => {
  await run.test.clock.until(() => true, { stepMs: 0, steps: 0 });
};

// Argo's Watch clock ticks once, and the run it starts has finished.
export async function watch(run: Journey): Promise<void> {
  await settled(run);

  const before = await completed(run);

  await run.test.clock.advance(watchIntervalMs);
  await expect
    .poll(() => completed(run), { timeout: watchIntervalMs })
    .toBeGreaterThan(before);
}

export const texts = (run: Journey): string[] =>
  promptsSent(run).map(({ text }) => text);

export const lintPrompt = `Check \`lint\` failed on ${reference} at ${sha.slice(0, shortHead)}. Read it, fix it, and push.`;

type Comment = Pick<FixtureComment, 'id' | 'path' | 'line' | 'body'> &
  Partial<Pick<FixtureComment, 'user' | 'author_association'>>;

// GitHub's review comments on the journey's pull request become these, oldest first; a member of the repository unless named.
export const reviewComments = (run: Journey, ...comments: Comment[]): void => {
  run.github.comments.set(
    reference,
    comments.map((comment) => ({
      user: { login: 'reviewer', type: 'User' },
      author_association: 'MEMBER',
      ...comment,
    })),
  );
};
