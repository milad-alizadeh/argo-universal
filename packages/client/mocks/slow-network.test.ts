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

  await vi.advanceTimersByTimeAsync(10_000);

  return { inner, slow: await opening };
}

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
