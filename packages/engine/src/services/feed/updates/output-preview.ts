import { StringDecoder } from 'node:string_decoder';

const previewBytes = 65_536;
const cutMark = '\n…\n';
const sides = 2;
// What each side keeps, so head, mark and tail fit the preview together.
const sideBytes = Math.floor(
  (previewBytes - Buffer.byteLength(cutMark)) / sides,
);
const continuationMask = 0xc0;
const continuationBits = 0x80;

// One text of a field, at its byte offset in the field's texts read end to end.
type Piece = { start: number; bytes: Buffer };

// A UTF-8 byte inside a character, never its first.
const isContinuationByte = (byte: number): boolean =>
  (byte & continuationMask) === continuationBits;

const clamp = (length: number, max: number): number =>
  Math.min(Math.max(length, 0), max);

// The whole characters in the first `length` bytes.
const headText = (bytes: Buffer, length: number): string =>
  new StringDecoder('utf8').write(bytes.subarray(0, length));

// The whole characters in the last `length` bytes.
const tailText = (bytes: Buffer, length: number): string => {
  const tail = bytes.subarray(bytes.length - length);
  const start = tail.findIndex((byte): boolean => !isContinuationByte(byte));
  return start < 0 ? '' : tail.subarray(start).toString();
};

const toPieces = (texts: readonly string[]): Piece[] =>
  texts.reduce<Piece[]>((pieces, text): Piece[] => {
    const last = pieces.at(-1);
    const start = last ? last.start + last.bytes.length : 0;
    return [...pieces, { start, bytes: Buffer.from(text) }];
  }, []);

// The text that holds the field's first cut byte carries the mark.
const markOf = ({ start, bytes }: Piece): string =>
  start < sideBytes && start + bytes.length >= sideBytes ? cutMark : '';

// A text cut to its share of the field's first and last bytes; one wholly between them is left out.
const previewPiece = (piece: Piece, total: number): string | undefined => {
  const { start, bytes } = piece;
  const head = clamp(sideBytes - start, bytes.length);
  const tail = clamp(start + bytes.length - (total - sideBytes), bytes.length);
  const text = `${headText(bytes, head)}${markOf(piece)}${tailText(bytes, tail)}`;
  return text === '' ? undefined : text;
};

// The texts of one output field, read end to end, cut to their first and last bytes within 64 KB; undefined when they fit.
export const previewTexts = (
  texts: readonly string[],
): (string | undefined)[] | undefined => {
  const total = texts.reduce(
    (bytes, text): number => bytes + Buffer.byteLength(text),
    0,
  );
  if (total <= previewBytes) return undefined;
  return toPieces(texts).map((piece) => previewPiece(piece, total));
};
