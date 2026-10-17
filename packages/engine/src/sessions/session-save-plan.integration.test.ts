import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { promptedArchiveSession } from '#mocks/archive';

const plan = '# Fix the README typo\n\n1. Read README.md\n2. Fix the typo\n';

let stop: (() => Promise<void>) | undefined;

afterEach(async () => {
  await stop?.();
  stop = undefined;
});

type SavedSession = Awaited<ReturnType<typeof promptedArchiveSession>> & {
  host: Awaited<ReturnType<typeof startAcpEngine>>;
};

async function savedSession(): Promise<SavedSession> {
  const host = await startAcpEngine({ steps: [] });
  stop = (): Promise<void> => host.stop();

  return { host, ...(await promptedArchiveSession(host)) };
}

it('saves the plan in the Checkout under its first heading, never over an earlier one', async () => {
  const { host, sessionId, path } = await savedSession();

  const first = await host.caller.session.savePlan({ sessionId, plan });
  const second = await host.caller.session.savePlan({ sessionId, plan });

  expect([first.path, second.path]).toEqual([
    join('.argo', 'plans', 'fix-the-readme-typo.md'),
    join('.argo', 'plans', 'fix-the-readme-typo-2.md'),
  ]);
  expect(await readFile(join(path, first.path), 'utf8')).toBe(plan);
});

it('names a plan with no heading "plan"', async () => {
  const { host, sessionId } = await savedSession();

  expect(
    await host.caller.session.savePlan({ sessionId, plan: '1. Fix it' }),
  ).toEqual({ path: join('.argo', 'plans', 'plan.md') });
});

it('keeps a heading of dots and slashes inside the plans folder', async () => {
  const { host, sessionId } = await savedSession();

  expect(
    await host.caller.session.savePlan({
      sessionId,
      plan: '# ../../etc/passwd',
    }),
  ).toEqual({ path: join('.argo', 'plans', 'etc-passwd.md') });
});
