import { ClockTick, SystemInfo } from '@repo/contracts';
import { expect, it } from 'vitest';

const systemInfo = {
  version: '1.2.3',
  startedAt: '2026-10-03T00:00:00.000Z',
  pid: 4242,
  name: 'Test machine',
};
it('keeps the System info mock aligned with the public contract', (): void => {
  expect(SystemInfo.parse(systemInfo)).toEqual(systemInfo);
});
it('rejects a malformed process id', (): void => {
  expect(SystemInfo.safeParse({ ...systemInfo, pid: 'one' }).success).toBe(
    false,
  );
});
it('keeps clock mocks aligned with the public contract', (): void => {
  const tick = { now: '2026-10-03T00:00:00.000Z' };
  expect(ClockTick.parse(tick)).toEqual(tick);
});
it('rejects a malformed clock time', (): void => {
  expect(ClockTick.safeParse({ now: 'not a time' }).success).toBe(false);
});
