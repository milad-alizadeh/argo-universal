import { describe, expect, it } from 'vitest';
import { pairedAppServer, serverStateOf } from './app-server';

const host = 'studio.local';

const port = 4000;

describe("a Server's own state", () => {
  it('reads from that Server and no other', () => {
    expect(serverStateOf('open')).toBe('connected');
    expect(serverStateOf('connecting')).toBe('connecting');
    expect(serverStateOf('offline')).toBe('unreachable');
  });

  // A Connection that has not given up is still trying, which is not the same as a Server out of reach.
  it('is still connecting while its Connection tries again', () => {
    expect(serverStateOf('reconnecting')).toBe('connecting');
  });
});

describe('a Server this Device paired with', () => {
  it('is listed by the key it paired on, with the address to try', () => {
    expect(
      pairedAppServer({
        name: 'Studio',
        key: 'studio-key',
        address: { host, port },
      }),
    ).toEqual({
      id: 'studio-key',
      name: 'Studio',
      serverDevice: false,
      url: `ws://${host}:${port}`,
    });
  });

  it('is listed with nowhere to open a Connection when no address is kept', () => {
    expect(
      pairedAppServer({ name: 'Workshop bench', key: 'bench-key' }).url,
    ).toBeUndefined();
  });
});
