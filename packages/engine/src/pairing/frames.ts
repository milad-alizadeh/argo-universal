const headerBytes = 2;

// One record of the channel, as long as its two-byte length allows.
export const maxRecordBytes = 65_535;

export function frameRecord(record: Buffer): Buffer {
  const header = Buffer.alloc(headerBytes);
  header.writeUInt16BE(record.length);

  return Buffer.concat([header, record]);
}

// TCP hands over whatever bytes have arrived, so each record is read back out of the stream by the length that precedes it.
export class FrameReader {
  private pending = Buffer.alloc(0);

  public push(chunk: Buffer): Buffer[] {
    this.pending = Buffer.concat([this.pending, chunk]);
    const records: Buffer[] = [];

    for (let record = this.take(); record; record = this.take())
      records.push(record);

    return records;
  }

  private take(): Buffer | undefined {
    if (this.pending.length < headerBytes) return undefined;
    const length = this.pending.readUInt16BE(0);

    if (this.pending.length < headerBytes + length) return undefined;
    const record = this.pending.subarray(headerBytes, headerBytes + length);
    this.pending = this.pending.subarray(headerBytes + length);

    return record;
  }
}
