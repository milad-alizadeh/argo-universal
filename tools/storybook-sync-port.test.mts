import { describe, expect, it } from 'vitest';
import {
  storybookServerOptions,
  storybookSyncPort,
} from './storybook-sync-port.js';

describe('Storybook sync port', (): void => {
  it('keeps the default shared channel unless a session opts into another port', (): void => {
    expect(storybookSyncPort()).toBe(7007);
    expect(storybookSyncPort('7012')).toBe(7012);
    expect(storybookServerOptions('7012')).toEqual({
      host: '127.0.0.1',
      port: 7012,
    });
    expect(storybookServerOptions().port).toBe(storybookSyncPort());
  });

  it.each(['0', '65536', 'port', '7012.5'])(
    'rejects an invalid sync port: %s',
    (value): void => {
      expect(() => storybookSyncPort(value)).toThrow(
        'EXPO_PUBLIC_STORYBOOK_WS_PORT must be a port from 1 to 65535',
      );
    },
  );
});
