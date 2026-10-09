import { expect, it } from 'vitest';
import { isIgnoredMethod } from './notification-kinds';
import type { ServerNotification } from './protocol.gen';

const officialNotifications = [
  { method: 'thread/name/updated', ignored: true },
  { method: 'item/reasoning/summaryPartAdded', ignored: true },
  { method: 'turn/started', ignored: false },
  { method: 'item/started', ignored: false },
] satisfies { method: ServerNotification['method']; ignored: boolean }[];

it.each([
  ...officialNotifications,
  { method: 'item/futureNotification', ignored: false },
  { method: 'toString', ignored: false },
  { method: 'constructor', ignored: false },
])(
  'ignores $method only when it is official and unconsumed ($ignored)',
  ({ method, ignored }): void => {
    expect(isIgnoredMethod(method)).toBe(ignored);
  },
);
