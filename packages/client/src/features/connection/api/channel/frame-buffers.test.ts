import { expect, it, vi } from 'vitest';
import { FrameReader, frameRecord } from './frames';
import {
  encodeClientFrame,
  FrameParser,
  opcodes,
  type WebSocketFrame,
} from './ws-frames';

const megabytes = 8;

const chunkBytes = 1024;

function inChunks(bytes: Uint8Array, size = chunkBytes): Uint8Array[] {
  const chunks: Uint8Array[] = [];

  for (let at = 0; at < bytes.length; at += size)
    chunks.push(bytes.slice(at, at + size));

  return chunks;
}

// A Server frame is never masked, so a client frame with the mask removed from the header stands in for one.
function serverFrame(payload: Uint8Array): Uint8Array {
  const masked = encodeClientFrame(opcodes.binary, payload, new Uint8Array(4));
  const lengthBytes = 8;
  const maskBytes = 4;
  const header = 2 + lengthBytes;
  const bytes = new Uint8Array(masked.length - maskBytes);
  bytes.set(masked.subarray(0, header));
  bytes[1] = (bytes[1] ?? 0) & 0x7f;
  bytes.set(masked.subarray(header + maskBytes), header);

  return bytes;
}

// The same frame with a 16-bit length: 126, then two length bytes, as a Server sends a payload under 64 KB.
function serverFrame16(payload: Uint8Array): Uint8Array {
  const masked = encodeClientFrame(opcodes.binary, payload, new Uint8Array(4));
  const header = 4;
  const maskBytes = 4;
  const bytes = new Uint8Array(masked.length - maskBytes);

  bytes.set(masked.subarray(0, header));
  bytes[1] = (bytes[1] ?? 0) & 0x7f;
  bytes.set(masked.subarray(header + maskBytes), header);

  return bytes;
}

const pattern = (length: number): Uint8Array =>
  Uint8Array.from({ length }, (_, at) => at % 251);

// Total bytes copied by `set` while `run` goes: joining a message once copies about its size, recopying what is pending on every chunk copies many times that.
function bytesCopiedBy(run: () => void): number {
  const set = vi.spyOn(Uint8Array.prototype, 'set');

  try {
    run();

    return set.mock.calls.reduce(
      (sum, [from]) => sum + (Array.isArray(from) ? 0 : from.length),
      0,
    );
  } finally {
    set.mockRestore();
  }
}

it('reads a multi-megabyte WebSocket frame fed in small chunks without recopying what is pending', () => {
  const payload = pattern(megabytes * 1024 * 1024);
  const chunks = inChunks(serverFrame(payload));
  const parser = new FrameParser();
  const frames: WebSocketFrame[] = [];

  const copied = bytesCopiedBy(() => {
    for (const chunk of chunks) frames.push(...parser.push(chunk));
  });

  expect(copied).toBeLessThan(payload.length * 2);
  expect(frames).toHaveLength(1);
  expect(Buffer.from(frames[0]?.payload ?? []).equals(payload)).toBe(true);
});

it.each([1, 3])(
  'reads records and a 16-bit-length frame split every %i bytes, even through their length headers',
  (size) => {
    const records = [pattern(300), pattern(5), pattern(0), pattern(700)];

    const stream = Uint8Array.from(
      records.flatMap((record) => [...frameRecord(record)]),
    );

    const reader = new FrameReader();
    const parser = new FrameParser();
    const frame = pattern(300);

    expect(
      inChunks(stream, size).flatMap((chunk) => reader.push(chunk)),
    ).toEqual(records);
    expect(
      inChunks(serverFrame16(frame), size).flatMap((chunk) =>
        parser.push(chunk),
      ),
    ).toEqual([{ fin: true, opcode: opcodes.binary, payload: frame }]);
  },
);

it('reads records fed in small chunks and keeps each intact', () => {
  const records = [pattern(60_000), pattern(5), pattern(40_000)];

  const stream = Uint8Array.from(
    records.flatMap((record) => [...frameRecord(record)]),
  );

  const reader = new FrameReader();

  const read = inChunks(stream).flatMap((chunk) => reader.push(chunk));

  expect(read).toEqual(records);
});
