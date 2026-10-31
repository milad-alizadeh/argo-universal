import { expect, it, vi } from 'vitest';
import {
  type KeepRunningChange,
  keepRunningSetting,
} from './keep-running-setting';

const idle = (): KeepRunningChange => ({
  isPending: false,
  error: null,
  mutate: vi.fn<KeepRunningChange['mutate']>(),
});

it('gives a paired Device no setting, even when the Server has answered', (): void => {
  expect(keepRunningSetting(true, true, idle())).toBeUndefined();
  expect(keepRunningSetting(true, false, idle())).toBeUndefined();
});

it('gives no setting until the Server has said what it is', (): void => {
  expect(keepRunningSetting(false, undefined, idle())).toBeUndefined();
});

it('gives the Server Device the Server’s answer, and sends a change to the Server', (): void => {
  const change = idle();
  const setting = keepRunningSetting(false, true, change);

  expect(setting?.enabled).toBe(true);
  setting?.onChange(false);
  expect(change.mutate).toHaveBeenCalledWith({ enabled: false });
});

it('shows what was asked for until the Server replies, then the failure', (): void => {
  const pending = { ...idle(), isPending: true, variables: { enabled: true } };
  const failed = { ...idle(), error: { message: 'Server is down' } };

  expect(keepRunningSetting(false, false, pending)?.enabled).toBe(true);
  expect(keepRunningSetting(false, false, failed)).toMatchObject({
    enabled: false,
    error: 'Server is down',
  });
});
