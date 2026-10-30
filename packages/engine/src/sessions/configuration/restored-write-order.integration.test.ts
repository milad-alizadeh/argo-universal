import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { SessionInsertJob, SessionRowUpdateJob } from '../session-storage';
import { AgentOptionsJob } from './agent-options-job';

type Spy = { mock: { calls: unknown[]; invocationCallOrder: number[] } };

const firstCommit = (spy: Spy): number => spy.mock.invocationCallOrder[0] ?? 0;

it('stores a new Session, then its Agent session, then its restored Agent options', async () => {
  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
  });

  const commits: Spy[] = [
    vi.spyOn(SessionInsertJob.prototype, 'commit'),
    vi.spyOn(SessionRowUpdateJob.prototype, 'commit'),
    vi.spyOn(AgentOptionsJob.prototype, 'commit'),
  ];

  await host.caller.session.new(emptySessionInput);
  await expect
    .poll(() => commits.every((spy) => spy.mock.calls.length > 0))
    .toBe(true);

  const [inserted, stored, options] = commits.map(firstCommit);

  expect(inserted).toBeLessThan(stored ?? 0);
  expect(stored).toBeLessThan(options ?? 0);
});
