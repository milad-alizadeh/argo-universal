import { concatBytes } from './bytes';

export const opcodes = {
  continuation: 0,
  text: 1,
  binary: 2,
  close: 8,
  ping: 9,
  pong: 10,
} as const;

export interface WebSocketFrame {
  readonly fin: boolean;
  readonly opcode: number;
  readonly payload: Uint8Array;
}

const finBit = 0x80;

const maskBit = 0x80;

const lengthMask = 0x7f;

const opcodeMask = 0x0f;

const maskBytes = 4;

const prefixBytes = 2;

const sixteenBitMarker = 126;

const sixtyFourBitMarker = 127;

const maxShortLength = 125;

const maxSixteenBits = 65_535;

const sixteenBitExtra = 2;

const sixtyFourBitExtra = 8;

const extraByMarker = new Map([
  [sixteenBitMarker, sixteenBitExtra],
  [sixtyFourBitMarker, sixtyFourBitExtra],
]);

const shortLength = (length: number): Uint8Array =>
  Uint8Array.of(maskBit | length);

function sixteenBitLength(length: number): Uint8Array {
  const field = new Uint8Array(prefixBytes + sixteenBitExtra - 1);
  field[0] = maskBit | sixteenBitMarker;
  new DataView(field.buffer).setUint16(1, length);

  return field;
}

function sixtyFourBitLength(length: number): Uint8Array {
  const field = new Uint8Array(1 + sixtyFourBitExtra);
  field[0] = maskBit | sixtyFourBitMarker;
  new DataView(field.buffer).setBigUint64(1, BigInt(length));

  return field;
}

type LengthEncoder = readonly [number, (length: number) => Uint8Array];

const lengthEncoders: readonly LengthEncoder[] = [
  [maxShortLength, shortLength],
  [maxSixteenBits, sixteenBitLength],
  [Number.MAX_SAFE_INTEGER, sixtyFourBitLength],
];

// The length as a client states it: with the mask bit set, in the smallest form that holds it (RFC 6455, section 5.2).
function lengthField(length: number): Uint8Array {
  const [, encode = sixtyFourBitLength] =
    lengthEncoders.find(([largest]) => length <= largest) ?? [];

  return encode(length);
}

// One whole message as a client must send it: masked, because RFC 6455 says a client's frames always are.
export function encodeClientFrame(
  opcode: number,
  payload: Uint8Array,
  mask: Uint8Array,
): Uint8Array {
  const masked = payload.map((byte, at) => byte ^ (mask[at % maskBytes] ?? 0));

  return concatBytes(
    Uint8Array.of(finBit | opcode),
    lengthField(payload.length),
    mask,
    masked,
  );
}

interface Header {
  readonly fin: boolean;
  readonly opcode: number;
  readonly size: number;
  readonly length: number;
}

const markerOf = (bytes: Uint8Array): number => (bytes[1] ?? 0) & lengthMask;

const extraOf = (marker: number): number => extraByMarker.get(marker) ?? 0;

// The header's size once all of it has arrived, and nothing before.
function headerSize(bytes: Uint8Array): number | undefined {
  if (bytes.length < prefixBytes) return undefined;
  const size = prefixBytes + extraOf(markerOf(bytes));

  return bytes.length < size ? undefined : size;
}

const lengthReaders = new Map([
  [sixteenBitMarker, (view: DataView): number => view.getUint16(2)],
  [
    sixtyFourBitMarker,
    (view: DataView): number => Number(view.getBigUint64(2)),
  ],
]);

function payloadLength(bytes: Uint8Array): number {
  const marker = markerOf(bytes);
  const read = lengthReaders.get(marker);

  return read ? read(new DataView(bytes.buffer, bytes.byteOffset)) : marker;
}

function readHeader(bytes: Uint8Array): Header | undefined {
  const size = headerSize(bytes);

  if (size === undefined) return undefined;
  const first = bytes[0] ?? 0;

  return {
    fin: (first & finBit) !== 0,
    opcode: first & opcodeMask,
    size,
    length: payloadLength(bytes),
  };
}

/*
 * Frames as the Server sends them, which are never masked. TCP hands over whatever has arrived, so a frame is read once all of it is here.
 */
export class FrameParser {
  private pending: Uint8Array = new Uint8Array(0);

  public push(chunk: Uint8Array): WebSocketFrame[] {
    this.pending = concatBytes(this.pending, chunk);
    const frames: WebSocketFrame[] = [];

    for (let frame = this.take(); frame; frame = this.take())
      frames.push(frame);

    return frames;
  }

  private take(): WebSocketFrame | undefined {
    const header = readHeader(this.pending);

    if (!header) return undefined;
    const end = header.size + header.length;

    if (this.pending.length < end) return undefined;
    const payload = this.pending.slice(header.size, end);
    this.pending = this.pending.subarray(end);

    return { fin: header.fin, opcode: header.opcode, payload };
  }
}
