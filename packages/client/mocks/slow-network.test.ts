import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ByteSocket } from '../src/features/connection/api/channel/byte-socket';
import { slowNetwork } from './slow-network';

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

function fakeSocket(): ByteSocket & { written: Uint8Array[] } {
  const written: Uint8Array[] = [];

  return {
    written,
    write: (data) => written.push(data),
    close: vi.fn<() => void>(),
    onData: () => {},
    onClose: () => {},
  };
}

const bytes = (length: number): Uint8Array => new Uint8Array(length);

async function opened(
  profile: Parameters<typeof slowNetwork>[1],
): Promise<{ inner: ReturnType<typeof fakeSocket>; slow: ByteSocket }> {
  const inner = fakeSocket();
  const open = slowNetwork(async () => inner, profile);
  const opening = open({ host: 'h', port: 1 });

  await vi.advanceTimersByTimeAsync(
    (profile.up.latencyMs ?? 0) + (profile.down.latencyMs ?? 0),
  );

  return { inner, slow: await opening };
}

it('opens after one round trip: the up latency plus the down latency', async () => {
  const open = slowNetwork(async () => fakeSocket(), {
    up: { latencyMs: 30 },
    down: { latencyMs: 70 },
  });

  const settled = vi.fn<() => void>();

  void open({ host: 'h', port: 1 }).then(settled);
  await vi.advanceTimersByTimeAsync(99);
  expect(settled).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(settled).toHaveBeenCalledOnce();
});

it('adds the bandwidth time and the latency together', async () => {
  const { inner, slow } = await opened({
    up: { latencyMs: 100, bytesPerSecond: 1000 },
    down: {},
  });

  slow.write(bytes(500));
  await vi.advanceTimersByTimeAsync(599);
  expect(inner.written).toHaveLength(0);
  await vi.advanceTimersByTimeAsync(1);
  expect(inner.written).toHaveLength(1);
});

it('frees the link again after an idle gap, so a later chunk does not queue behind old ones', async () => {
  const { inner, slow } = await opened({
    up: { bytesPerSecond: 1000 },
    down: {},
  });

  slow.write(bytes(100));
  await vi.advanceTimersByTimeAsync(10_000);
  expect(inner.written).toHaveLength(1);
  slow.write(bytes(100));
  await vi.advanceTimersByTimeAsync(99);
  expect(inner.written).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(inner.written).toHaveLength(2);
});

it('closes up after the bytes written before it, even when both are due together', async () => {
  const { inner, slow } = await opened({ up: { latencyMs: 20 }, down: {} });
  const events: string[] = [];

  inner.write = (): number => events.push('write');
  inner.close = (): number => events.push('close');
  slow.write(bytes(10));
  slow.close();
  await vi.advanceTimersByTimeAsync(1000);
  expect(events).toEqual(['write', 'close']);
});

it('holds bytes sent up for the up latency, and no longer', async () => {
  const { inner, slow } = await opened({ up: { latencyMs: 100 }, down: {} });

  slow.write(bytes(5));
  await vi.advanceTimersByTimeAsync(99);
  expect(inner.written).toHaveLength(0);
  await vi.advanceTimersByTimeAsync(1);
  expect(inner.written).toHaveLength(1);
});

it('holds bytes arriving down for the down latency, not the up one', async () => {
  const { inner, slow } = await opened({
    up: { latencyMs: 500 },
    down: { latencyMs: 40 },
  });

  const received: number[] = [];

  slow.onData = (chunk): number => received.push(chunk.length);
  inner.onData(bytes(7));
  await vi.advanceTimersByTimeAsync(39);
  expect(received).toEqual([]);
  await vi.advanceTimersByTimeAsync(1);
  expect(received).toEqual([7]);
});

it('spends bandwidth on each byte in turn, so a second chunk queues behind the first', async () => {
  // 1000 bytes/s: 500 bytes take 500 ms on the wire.
  const { inner, slow } = await opened({
    up: { bytesPerSecond: 1000 },
    down: {},
  });

  slow.write(bytes(500));
  slow.write(bytes(500));
  await vi.advanceTimersByTimeAsync(499);
  expect(inner.written).toHaveLength(0);
  await vi.advanceTimersByTimeAsync(1);
  expect(inner.written).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(499);
  expect(inner.written).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(inner.written).toHaveLength(2);
});

it('limits each direction on its own', async () => {
  const { inner, slow } = await opened({
    up: {},
    down: { bytesPerSecond: 100 },
  });

  const received: number[] = [];

  slow.onData = (chunk): number => received.push(chunk.length);
  slow.write(bytes(1000));
  await vi.advanceTimersByTimeAsync(0);
  expect(inner.written).toHaveLength(1);
  inner.onData(bytes(100));
  await vi.advanceTimersByTimeAsync(999);
  expect(received).toEqual([]);
  await vi.advanceTimersByTimeAsync(1);
  expect(received).toEqual([100]);
});

it('delivers a close after the bytes that came before it', async () => {
  const { inner, slow } = await opened({
    up: {},
    down: { latencyMs: 50, bytesPerSecond: 1000 },
  });

  const events: string[] = [];

  slow.onData = (): number => events.push('data');
  slow.onClose = (): number => events.push('close');
  inner.onData(bytes(100));
  inner.onClose();
  await vi.advanceTimersByTimeAsync(1000);
  expect(events).toEqual(['data', 'close']);
});

it('shares one bandwidth between every socket opened through it, as a phone has one radio', async () => {
  const first = fakeSocket();
  const second = fakeSocket();
  const sockets = [first, second];

  const open = slowNetwork(async () => sockets.shift() ?? fakeSocket(), {
    up: { bytesPerSecond: 1000 },
    down: {},
  });

  const opening = Promise.all([
    open({ host: 'h', port: 1 }),
    open({ host: 'h', port: 1 }),
  ]);

  await vi.advanceTimersByTimeAsync(0);
  const [one, other] = await opening;

  one.write(bytes(500));
  other.write(bytes(500));
  await vi.advanceTimersByTimeAsync(500);
  expect(first.written).toHaveLength(1);
  expect(second.written).toHaveLength(0);
  await vi.advanceTimersByTimeAsync(500);
  expect(second.written).toHaveLength(1);
});
