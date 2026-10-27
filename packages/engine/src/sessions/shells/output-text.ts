const maximumIncompleteBytes = 3;

export type DecodedOutput = { text: string; consumed: number };

const isIncomplete = (bytes: Buffer): boolean => {
  try {
    return (
      new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes, {
        stream: true,
      }) === ''
    );
  } catch {
    return false;
  }
};

// A valid unfinished UTF-8 sequence holds at most three source bytes.
const incompleteTail = (bytes: Buffer): number => {
  for (
    let size = Math.min(maximumIncompleteBytes, bytes.length);
    size > 0;
    size -= 1
  )
    if (isIncomplete(bytes.subarray(-size))) return size;

  return 0;
};

export const decodeShellOutput = (
  bytes: Buffer,
  final: boolean,
): DecodedOutput => {
  const consumed = bytes.length - (final ? 0 : incompleteTail(bytes));

  return {
    text: new TextDecoder('utf-8', { ignoreBOM: true }).decode(
      bytes.subarray(0, consumed),
    ),
    consumed,
  };
};
