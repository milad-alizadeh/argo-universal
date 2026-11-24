import { expect, it } from 'vitest';
import { FrameReader, frameRecord } from './frames';
import { encodeClientFrame, FrameParser, opcodes } from './ws-frames';

const megabytes = 8;

const chunkBytes = 1024;

const budgetMs = 1000;

function inChunks(bytes: Uint8Array): Uint8Array[] {
  const chunks: Uint8Array[] = [];

  for (let at = 0; at < bytes.length; at += chunkBytes)
    chunks.push(bytes.slice(at, at + chunkBytes));

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

const pattern = (length: number): Uint8Array =>
  Uint8Array.from({ length }, (_, at) => at % 251);

it('reads a multi-megabyte WebSocket frame fed in small chunks without recopying what is pending', () => {
  const payload = pattern(megabytes * 1024 * 1024);
  const parser = new FrameParser();

  const started = performance.now();

  const frames = inChunks(serverFrame(payload)).flatMap((chunk) =>
    parser.push(chunk),
  );

  expect(performance.now() - started).toBeLessThan(budgetMs);
  expect(frames).toHaveLength(1);
  expect(Buffer.from(frames[0]?.payload ?? []).equals(payload)).toBe(true);
});

it('reads records fed in small chunks and keeps each intact', () => {
  const records = [pattern(60_000), pattern(5), pattern(40_000)];

  const stream = Uint8Array.from(
    records.flatMap((record) => [...frameRecord(record)]),
  );

  const reader = new FrameReader();

  const read = inChunks(stream).flatMap((chunk) => reader.push(chunk));

  expect(read).toEqual(records);
});
