import { ByteQueue } from './byte-queue';
import { concatBytes } from './bytes';

const headerBytes = 2;

// One record of the channel, as long as its two-byte length allows.
export const maxRecordBytes = 65_535;

export function frameRecord(record: Uint8Array): Uint8Array {
  const header = new Uint8Array(headerBytes);
  new DataView(header.buffer).setUint16(0, record.length);

  return concatBytes(header, record);
}

// Where the first record in these bytes ends, once all of it is here.
function recordEnd(bytes: Uint8Array, held: number): number | undefined {
  if (bytes.length < headerBytes) return undefined;

  const end =
    headerBytes + new DataView(bytes.buffer, bytes.byteOffset).getUint16(0);

  return held < end ? undefined : end;
}

// TCP hands over whatever bytes have arrived, so each record is read back out of the stream by the length that precedes it.
export class FrameReader {
  private readonly pending = new ByteQueue();

  public push(chunk: Uint8Array): Uint8Array[] {
    this.pending.push(chunk);
    const records: Uint8Array[] = [];

    for (let record = this.take(); record; record = this.take())
      records.push(record);

    return records;
  }

  private take(): Uint8Array | undefined {
    const end = recordEnd(this.pending.peek(headerBytes), this.pending.length);

    if (end === undefined) return undefined;

    return this.pending.take(end).subarray(headerBytes);
  }
}
