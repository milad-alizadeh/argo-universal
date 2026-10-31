import { describe, expect, it } from 'vitest';
import type { ServerRow } from './server-rows';
import { serverRow, serverRowName, serverStateLabel } from './server-rows';

const ownId = 'server-device';

const studioId = 'studio-key';

const own: ServerRow = {
  id: ownId,
  name: 'This computer',
  serverDevice: true,
  state: 'connected',
};

const studio: ServerRow = {
  id: studioId,
  name: 'Studio',
  serverDevice: false,
  state: 'unreachable',
};

describe("a Server's row", () => {
  it("says that Server's state and not the list's", () => {
    expect(serverStateLabel(own.state)).toBe('Connected');
    expect(serverStateLabel(studio.state)).toBe('Unreachable');
  });

  it('is spoken as the Server and its state', () => {
    expect(serverRowName(studio)).toBe('Studio, Unreachable');
    expect(serverRowName(own)).toBe('This computer, Connected');
  });

  it('reads the state of its own Server and no other', () => {
    const states = new Map([
      [ownId, 'connected'],
      [studioId, 'connecting'],
    ] as const);

    expect(
      serverRow({ id: studioId, name: 'Studio', serverDevice: false }, states),
    ).toMatchObject({ state: 'connecting' });
  });

  // No Connection was opened to it, because this Device has no address for it.
  it('reads unreachable when its Server has no state of its own', () => {
    expect(serverRow(studio, new Map())).toMatchObject({
      state: 'unreachable',
    });
  });
});
