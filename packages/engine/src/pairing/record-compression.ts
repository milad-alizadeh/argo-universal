import { promisify } from 'node:util';
import { deflateRaw, inflateRawSync } from 'node:zlib';

const deflateRawAsync = promisify(deflateRaw);

// A message under this many bytes is not worth the trouble of deflating (ADR-0045).
export const compressionThreshold = 1024;

const stored = 0;

const deflated = 1;

// Once the App has offered compression and the Server has agreed, every record opens with one byte that says which: 0 means the rest is the message as it is, 1 that it is raw deflate.
export const leadingBytes = 1;

/*
 * One record's plaintext, packed, off the event loop: deflated alone, with no dictionary carried over, unless it is small or does not shrink (an image, or anything already compressed), in which case it goes as it is.
 */
export async function packRecord(message: Buffer): Promise<Buffer> {
  if (message.length >= compressionThreshold) {
    const smaller = await deflateRawAsync(message);

    if (smaller.length < message.length)
      return Buffer.concat([Buffer.of(deflated), smaller]);
  }

  return Buffer.concat([Buffer.of(stored), message]);
}

/*
 * What `packRecord` made, undone. A record never holds more than `limit` bytes of message, so one that inflates past it is refused rather than inflated: a few kilobytes of deflate must not become the Server's memory.
 */
export function unpackRecord(record: Buffer, limit: number): Buffer {
  const body = record.subarray(leadingBytes);

  if (record[0] === stored) return body;

  if (record[0] === deflated)
    return inflateRawSync(body, { maxOutputLength: limit });

  throw new Error('A record opened with an unknown compression byte');
}
