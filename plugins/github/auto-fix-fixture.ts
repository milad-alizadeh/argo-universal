import { expect } from 'vitest';
import { reference, repository } from './auto-merge-fixture';
import { sha } from './github-fixture';
import type { Journey } from './journey-fixture';
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

const completed = async (run: Journey): Promise<number> =>
  (await run.test.log())
    .split('\n')
    .filter((line) => line.includes('watch completed')).length;

const watchIntervalMs = 60_000;

// Argo's Watch clock ticks once, and the run it starts has finished.
export async function watch(run: Journey): Promise<void> {
  const before = await completed(run);

  await run.test.clock.advance(watchIntervalMs);
  await expect
    .poll(() => completed(run), { timeout: watchIntervalMs })
    .toBeGreaterThan(before);
}

export const texts = (run: Journey): string[] =>
  promptsSent(run).map(({ text }) => text);

export const lintPrompt = `Check \`lint\` failed on ${reference} at ${sha.slice(0, shortHead)}. Read it, fix it, and push.`;
