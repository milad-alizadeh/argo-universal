// Agents surround the reply with their own text (pi prints a startup banner, models add code fences or prose), so every balanced JSON object in it is a candidate, the last first.
export function jsonObjects(text: string): string[] {
  return [...text.matchAll(/\{/g)]
    .map(({ index }) => index)
    .reverse()
    .flatMap((start) => {
      const end = closingBrace(text, start);

      return end === -1 ? [] : [text.slice(start, end + 1)];
    });
}

type Scan = { depth: number; inString: boolean; escaped: boolean };

const depthChange = new Map([
  ['{', 1],
  ['}', -1],
]);

function closingBrace(text: string, start: number): number {
  const scan: Scan = { depth: 0, inString: false, escaped: false };

  for (let index = start; index < text.length; index += 1)
    if (closes(scan, text.charAt(index))) return index;

  return -1;
}

// True when this character closes the object the scan started on.
function closes(scan: Scan, character: string): boolean {
  if (scan.inString) return readString(scan, character);

  return readCode(scan, character);
}

// Inside a string only a quote that no backslash escapes ends it.
function readString(scan: Scan, character: string): false {
  const escaped = scan.escaped;

  scan.escaped = !escaped && character === '\\';
  scan.inString = escaped || character !== '"';

  return false;
}

function readCode(scan: Scan, character: string): boolean {
  scan.inString = character === '"';
  scan.depth += depthChange.get(character) ?? 0;

  return character === '}' && scan.depth === 0;
}
