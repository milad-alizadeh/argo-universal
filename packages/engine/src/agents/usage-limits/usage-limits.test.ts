import type { AgentUsageLimits, UsageLimit } from '@repo/contracts';
import { expect, it, onTestFinished } from 'vitest';
import { UsageLimits } from './usage-limits';

const subject = { agent: 'agent-1', projectId: 'project-1' };

const limit = (
  id: string,
  used: number,
  observedAt = '2026-11-18T10:00:00.000Z',
): UsageLimit => ({
  id,
  label: id,
  capacity: 'available',
  measure: { kind: 'fraction', used },
  observed: 'admission',
  observedAt,
});

const watch = (limits: UsageLimits): AgentUsageLimits[] => {
  const watching = new AbortController();
  onTestFinished(() => watching.abort());
  const seen: AgentUsageLimits[] = [];

  void (async (): Promise<void> => {
    for await (const change of limits.watch(subject, watching.signal))
      seen.push(change);
  })();

  return seen;
};

it('keeps the newest reading of each limit and the others beside it', () => {
  const limits = new UsageLimits();

  limits.publish(subject, [limit('five_hour', 0.2)]);
  limits.publish(subject, [limit('seven_day', 0.1)]);
  limits.publish(subject, [limit('five_hour', 0.5)]);

  expect(limits.read(subject)).toEqual({
    limits: [limit('five_hour', 0.5), limit('seven_day', 0.1)],
  });
});

it('keeps each Agent and Project apart', () => {
  const limits = new UsageLimits();

  limits.publish(subject, [limit('five_hour', 0.2)]);

  expect(limits.read({ ...subject, projectId: 'project-2' })).toEqual({
    limits: [],
  });
  expect(limits.read({ ...subject, agent: 'agent-2' })).toEqual({
    limits: [],
  });
});

it('tells watchers of a change but not of the same values read again', async () => {
  const limits = new UsageLimits();
  const seen = watch(limits);
  const other = watch(new UsageLimits());
  await Promise.resolve();

  limits.publish(subject, [limit('five_hour', 0.2)]);
  limits.publish(subject, [
    limit('five_hour', 0.2, '2026-11-18T10:05:00.000Z'),
  ]);
  limits.publish(subject, [limit('five_hour', 0.3)]);
  limits.publish({ ...subject, projectId: 'project-2' }, [
    limit('five_hour', 0.9),
  ]);

  await expect
    .poll(() => seen)
    .toEqual([
      { limits: [limit('five_hour', 0.2)] },
      { limits: [limit('five_hour', 0.3)] },
    ]);
  expect(other).toEqual([]);
});
