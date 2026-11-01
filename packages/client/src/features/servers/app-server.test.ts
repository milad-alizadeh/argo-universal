import { describe, expect, it } from 'vitest';
import { ownAppServer, pairedAppServer, serverStateOf } from './app-server';

const host = 'studio.local';

const port = 4000;

const studioKey = 'studio-key';

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
  it('is listed by the key it paired on, with the channel to open', () => {
    expect(
      pairedAppServer({
        name: 'Studio',
        key: studioKey,
        address: { host, port },
      }),
    ).toEqual({
      id: studioKey,
      name: 'Studio',
      serverDevice: false,
      channel: { host, port, serverPublicKey: studioKey },
    });
  });

  // No URL is ever built for a paired Server: not a ws:// address, and not an http:// one for its Blobs (ADR-0045).
  it('has no URL to open', () => {
    expect(
      pairedAppServer({
        name: 'Studio',
        key: studioKey,
        address: { host: '::1', port },
      }).url,
    ).toBeUndefined();
  });

  it('is listed with nowhere to open a Connection when no address is kept', () => {
    expect(
      pairedAppServer({ name: 'Workshop bench', key: 'bench-key' }).channel,
    ).toBeUndefined();
  });
});

/*
 * What tells the screens under one Server whether this Device is its Server Device or a Paired Device: the Settings
 * Device heading and the Server-Device-only pages key off it, and so does every guard that keeps a Paired Device from
 * asking for an answer the Server gives the Server Device alone (ADR-0022).
 */
describe('this Device, as one Server reads it', () => {
  it('is the Server Device of the Server on this Device', () => {
    expect(ownAppServer(`ws://127.0.0.1:${port}`).serverDevice).toBe(true);
  });

  it('is a Paired Device of a Server it paired with', () => {
    expect(
      pairedAppServer({ name: 'Studio', key: studioKey }).serverDevice,
    ).toBe(false);
  });
});
