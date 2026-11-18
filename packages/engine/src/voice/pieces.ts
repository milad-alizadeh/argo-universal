// The most bytes of an Agent message the voice is sent at once.
export const pieceBytes = 500;

const byteLength = (text: string): number => Buffer.byteLength(text, 'utf8');

// The longest start of `text` that fits `limit` bytes without cutting a character.
function fitting(text: string, limit: number): string {
  let end = 0;

  for (const character of text) {
    if (byteLength(text.slice(0, end + character.length)) > limit) break;
    end += character.length;
  }

  return text.slice(0, end);
}

// Ends a piece at the last space when that leaves most of it, so words stay whole.
function atWord(piece: string, whole: boolean): string {
  const space = piece.lastIndexOf(' ');

  return whole || space < piece.length / 2 ? piece : piece.slice(0, space);
}

// A message in pieces of at most 500 bytes, in order; nothing is dropped and no character is split.
export function inPieces(text: string, limit = pieceBytes): string[] {
  const pieces: string[] = [];
  let rest = text.trim();

  while (rest.length > 0) {
    const piece = atWord(fitting(rest, limit), byteLength(rest) <= limit);
    pieces.push(piece.trim());
    rest = rest.slice(piece.length).trim();
  }

  return pieces;
}
