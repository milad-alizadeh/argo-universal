import type {
  ByteSocket,
  OpenSocket,
} from '../src/features/connection/api/channel/byte-socket';

// One direction of a link. Latency is how long a byte takes to cross; bandwidth is how many bytes per second the link carries, so a big chunk occupies it and the next waits. Leave either out for none.
export interface Link {
  latencyMs?: number;
  bytesPerSecond?: number;
}

// Each direction is set on its own: a phone's uplink is usually the narrower one.
export interface NetworkProfile {
  up: Link;
  down: Link;
}

// Wi-Fi at the edge of the room: a noticeable round trip, and a slow pipe.
export const badWifi: NetworkProfile = {
  up: { latencyMs: 60, bytesPerSecond: 250_000 },
  down: { latencyMs: 60, bytesPerSecond: 500_000 },
};

interface Wire {
  send: (deliver: () => void, bytes: number) => void;
}

/*
 * A one-way pipe that keeps order. A chunk first occupies the link for length / bandwidth, behind any chunk already on it, then flies for the latency. Closes ride the same pipe with zero length, so none overtakes the bytes before it.
 */
function wire({ latencyMs = 0, bytesPerSecond }: Link): Wire {
  let freeAt = 0;

  return {
    send: (deliver, bytes) => {
      const now = Date.now();
      const onWire = bytesPerSecond ? (bytes / bytesPerSecond) * 1000 : 0;

      freeAt = Math.max(freeAt, now) + onWire;
      setTimeout(deliver, freeAt - now + latencyMs);
    },
  };
}

function slowed(inner: ByteSocket, profile: NetworkProfile): ByteSocket {
  const up = wire(profile.up);
  const down = wire(profile.down);

  const slow: ByteSocket = {
    write: (data) => up.send(() => inner.write(data), data.length),
    close: () => up.send(() => inner.close(), 0),
    onData: () => {},
    onClose: () => {},
  };

  inner.onData = (chunk): void =>
    down.send(() => slow.onData(chunk), chunk.length);
  inner.onClose = (error): void =>
    down.send(() => slow.onClose(error), 0);

  return slow;
}

/*
 * A test wrapper on `ChannelPlatform.openSocket` that adds latency and a bandwidth limit to each direction, so an integration test can run the real channel over a slow Connection and measure what a transport change gains. Opening the socket costs one round trip, as a TCP and upgrade would.
 */
export function slowNetwork(
  open: OpenSocket,
  profile: NetworkProfile,
): OpenSocket {
  return async (address) => {
    const socket = slowed(await open(address), profile);
    const connect = (profile.up.latencyMs ?? 0) + (profile.down.latencyMs ?? 0);

    await new Promise((resolve) => setTimeout(resolve, connect));

    return socket;
  };
}
