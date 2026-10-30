import { createHash, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { crc32, deflateSync } from 'node:zlib';

export type AttachmentKind = 'text' | 'image';

export type AttachmentSize = 'small' | 'large';

// Synthetic only: noise that a Server cannot have seen before, so a stored copy never answers for the upload.
const textBytes = { small: 4 * 1024, large: 8 * 1024 * 1024 } as const;

const imageSide = { small: 64, large: 1600 } as const;

export interface AttachmentFile {
  path: string;
  name: string;
  bytes: number;
  // The Server stores a Blob under the SHA-256 of its bytes.
  blobId: string;
}

const chunk = (type: string, data: Buffer): Buffer => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));

  return Buffer.concat([length, body, checksum]);
};

const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// IHDR for an 8-bit RGB image, which `deflate` below fills with unfilterable rows.
function pngHeader(side: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(side, 0);
  header.writeUInt32BE(side, 4);
  header.set([8, 2, 0, 0, 0], 8);

  return header;
}

const noiseRow = (side: number): Buffer =>
  Buffer.concat([Buffer.from([0]), randomBytes(side * 3)]);

// A square RGB PNG of random pixels, which deflate cannot shrink.
function noisePng(side: number): Buffer {
  const rows = Buffer.concat(
    Array.from({ length: side }, () => noiseRow(side)),
  );

  return Buffer.concat([
    signature,
    chunk('IHDR', pngHeader(side)),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// What a file of this kind and size holds, for a report to name beside its timings.
export const payload = (kind: AttachmentKind, size: AttachmentSize): string =>
  kind === 'text'
    ? `${textBytes[size]} bytes of random hex text`
    : `${imageSide[size]}x${imageSide[size]} px random-noise PNG, about ${imageSide[size] ** 2 * 3} bytes`;

const contents = (kind: AttachmentKind, size: AttachmentSize): Buffer =>
  kind === 'image'
    ? noisePng(imageSide[size])
    : Buffer.from(randomBytes(textBytes[size] / 2).toString('hex'));

export interface AttachmentRequest {
  kind: AttachmentKind;
  size: AttachmentSize;
  trial: number;
}

const fileName = ({ kind, size, trial }: AttachmentRequest): string =>
  `perf-${size}-${trial}.${kind === 'image' ? 'png' : 'txt'}`;

// Writes a new file of random content under `directory`; every call yields a different Blob.
export async function attachmentFile(
  directory: string,
  request: AttachmentRequest,
): Promise<AttachmentFile> {
  const bytes = contents(request.kind, request.size);
  const name = fileName(request);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, name), bytes);

  return {
    path: path.join(directory, name),
    name,
    bytes: bytes.byteLength,
    blobId: createHash('sha256').update(bytes).digest('hex'),
  };
}
