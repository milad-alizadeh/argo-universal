import { expect, it } from 'vitest';
import { failedItem, fixPrompt, texts, watch } from './auto-fix-fixture';
import {
  attached,
  automationOf,
  repository,
  tap,
  reference,
} from './auto-merge-fixture';
import { sha } from './github-fixture';
import { sessionId, type Journey } from './journey-fixture';
import { shortHead } from './pull-reads';

const slow = 120_000;

const minute = 60_000;

// A failed run of `lint` on the journey's head, under GitHub's id for that run.
const lintFails = (run: Journey, id: number): void => {
  run.github.checks.set(`${repository}@${sha}`, [
    { id, name: 'lint', status: 'completed', conclusion: 'failure' },
  ]);
};

// How long the journey's Session has had nothing happen; null while it works.
const idle = (run: Journey, idleFor: number | null): void => {
  run.sessions[sessionId] = { ...run.sessions[sessionId], idleFor };
};

const short = sha.slice(0, shortHead);

const stillRedPrompt = [
  `Auto-fix: CI is still red on ${reference} at ${short}, and nothing has happened for 30 minutes:`,
  `- ${failedItem('lint')}`,
  'If you asked the person something, they have not answered: take the option you recommended.',
  `Fix them, then push once. If the head is no longer ${short}, check what is still failing first.`,
].join('\n\n');

const lintPrompt = fixPrompt(sha, [failedItem('lint')]);

it(
  'prompts again when a re-run of a Check fails on the same commit',
  async () => {
    const run = await attached();

    lintFails(run, 1);
    await tap(run, { kind: 'fix', on: true });
    await watch(run);
    expect(texts(run)).toEqual([lintPrompt]);

    lintFails(run, 2);
    await watch(run);
    await watch(run);

    expect(texts(run)).toEqual([lintPrompt, lintPrompt]);
  },
  slow,
);

it(
  'prompts again once the Session has sat idle for 30 minutes with CI still red, within three tries',
  async () => {
    const run = await attached();

    lintFails(run, 1);
    await tap(run, { kind: 'fix', on: true });
    await watch(run);
    expect(texts(run)).toEqual([lintPrompt]);

    idle(run, 29 * minute);
    await watch(run);
    expect(texts(run)).toEqual([lintPrompt]);

    idle(run, 30 * minute);
    await watch(run);
    expect(texts(run)).toEqual([lintPrompt, stillRedPrompt]);

    // The Agent works on it: nothing more while the Session is busy.
    idle(run, null);
    await watch(run);
    expect(texts(run)).toEqual([lintPrompt, stillRedPrompt]);

    idle(run, 45 * minute);
    await watch(run);
    await watch(run);

    expect(texts(run)).toEqual([lintPrompt, stillRedPrompt, stillRedPrompt]);
    expect((await automationOf(run)).fix).toEqual({
      on: false,
      available: true,
      reason: `Stopped after 3 tries on \`${short}\``,
    });
  },
  slow,
);

it(
  'does not prompt again for an idle Session once CI is green',
  async () => {
    const run = await attached();

    lintFails(run, 1);
    await tap(run, { kind: 'fix', on: true });
    await watch(run);

    run.github.checks.set(`${repository}@${sha}`, [
      { id: 2, name: 'lint', status: 'completed', conclusion: 'success' },
    ]);
    idle(run, 60 * minute);
    await watch(run);

    expect(texts(run)).toEqual([lintPrompt]);
  },
  slow,
);
