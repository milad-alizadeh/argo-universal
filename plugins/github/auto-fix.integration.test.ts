import { expect, it } from 'vitest';
import { attach, changesOf, detach } from './journey-calls-fixture';
import {
  journey,
  project,
  restart,
  sessionId,
  type Journey,
} from './journey-fixture';
import { changePull, newHead, pushed } from './journey-watch-fixture';
import { promptsSent } from './journey-prompts-fixture';
import { sha } from './github-fixture';

const slow = 120_000;

const repository = 'owner/repository';

const reference = `${repository}#12`;

const failing = (...names: string[]) =>
  names.map((name) => ({
    name,
    status: 'completed' as const,
    conclusion: 'failure' as const,
  }));

const failChecks = (run: Journey, head: string, ...names: string[]): void => {
  run.github.checks.set(`${repository}@${head}`, failing(...names));
};

const tap = (run: Journey, on: boolean) =>
  run.test.operations.run({
    name: 'automationSet',
    params: { reference, sessionId, kind: 'fix', on },
    caller: { projectId: project.id, person: true },
  });

type Offer = { on: boolean; available: boolean; reason?: string };

async function fixOffer(run: Journey): Promise<Offer | undefined> {
  const [change] = await changesOf(run);

  return (change as { automation?: { fix: Offer } } | undefined)?.automation
    ?.fix;
}

const completed = async (run: Journey): Promise<number> =>
  (await run.test.log()).split('\n').filter((line) => line.includes('watch completed')).length;

// Argo's Watch clock ticks once, and the run it starts has finished.
async function watch(run: Journey): Promise<void> {
  const before = await completed(run);

  await run.test.clock.advance(60_000);
  await expect.poll(() => completed(run), { timeout: 60_000 }).toBeGreaterThan(before);
}

async function attached(): Promise<Journey> {
  const run = await journey();

  await attach(run, reference);

  return run;
}

const texts = (run: Journey): string[] => promptsSent(run).map(({ text }) => text);

const lintPrompt = `Check \`lint\` failed on ${reference} at ${sha.slice(0, 7)}. Read it, fix it, and push.`;

it(
  'is off by default and prompts nothing for a failed Check',
  async () => {
    const run = await attached();

    failChecks(run, sha, 'lint');
    await watch(run);

    expect(promptsSent(run)).toEqual([]);
    expect(await fixOffer(run)).toEqual({ on: false, available: true });
  },
  slow,
);

it(
  'sends one Prompt per new failed Check, never twice, and leaves failures from before it was turned on',
  async () => {
    const run = await attached();

    failChecks(run, sha, 'old');
    await tap(run, true);
    expect(await fixOffer(run)).toEqual({ on: true, available: true });

    await watch(run);
    expect(promptsSent(run)).toEqual([]);

    failChecks(run, sha, 'old', 'lint');
    await watch(run);
    await watch(run);

    expect(promptsSent(run)).toEqual([
      {
        sessionId,
        text: lintPrompt,
        sender: { pluginId: 'github', title: expect.any(String) },
      },
    ]);
  },
  slow,
);

it(
  'treats the failures of a new push as new, and keeps its choice across a restart',
  async () => {
    const run = await attached();

    await tap(run, true);
    failChecks(run, sha, 'lint');
    await watch(run);
    await restart(run);

    changePull(run, 12, { head: pushed(12) });
    failChecks(run, newHead, 'lint');
    await watch(run);

    expect(texts(run)).toEqual([
      lintPrompt,
      `Check \`lint\` failed on ${reference} at ${newHead.slice(0, 7)}. Read it, fix it, and push.`,
    ]);
    expect((await fixOffer(run))?.on).toBe(true);
  },
  slow,
);

it(
  'turns itself off after three Prompts on one head, says why, and clears the reason on a push or turning it on',
  async () => {
    const run = await attached();

    await tap(run, true);
    failChecks(run, sha, 'a', 'b', 'c');
    await watch(run);

    expect(promptsSent(run)).toHaveLength(3);
    expect(await fixOffer(run)).toEqual({
      on: false,
      available: true,
      reason: `Stopped after 3 tries on \`${sha.slice(0, 7)}\``,
    });

    failChecks(run, sha, 'a', 'b', 'c', 'd');
    await watch(run);
    expect(promptsSent(run)).toHaveLength(3);

    changePull(run, 12, { head: pushed(12) });
    expect(await fixOffer(run)).toEqual({ on: false, available: true });

    changePull(run, 12, {});
    await tap(run, true);
    expect(await fixOffer(run)).toEqual({ on: true, available: true });
  },
  slow,
);

it(
  'never turns off or prompts on a failed read',
  async () => {
    const run = await attached();

    await tap(run, true);
    failChecks(run, sha, 'lint');
    run.github.checksFailWith.set(`${repository}@${sha}`, 500);
    await watch(run);

    expect(promptsSent(run)).toEqual([]);
    expect((await fixOffer(run))?.on).toBe(true);

    run.github.checksFailWith.clear();
    await watch(run);
    expect(texts(run)).toEqual([lintPrompt]);
  },
  slow,
);

it(
  'forgets Auto-fix when the pull request is detached',
  async () => {
    const run = await attached();

    await tap(run, true);
    await detach(run, reference);
    await attach(run, reference);

    expect(await fixOffer(run)).toEqual({ on: false, available: true });

    failChecks(run, sha, 'lint');
    await watch(run);
    expect(promptsSent(run)).toEqual([]);
  },
  slow,
);

it(
  'is refused for a pull request that is not attached',
  async () => {
    const run = await journey();

    await expect(
      run.test.operations.run({
        name: 'automationSet',
        params: { reference, sessionId, kind: 'fix', on: true },
        caller: { projectId: project.id, person: true },
      }),
    ).rejects.toThrow('not attached');
  },
  slow,
);
