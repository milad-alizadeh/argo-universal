// One page of a file's unified diff: its header lines, then up to `limit` of its changed and context lines.
export type PatchPage = { patch: string; nextCursor: number | null };

type Hunk = {
  oldStart: number;
  newStart: number;
  section: string;
  header: string;
  entries: Entry[];
};

// A diff line, with the "\ No newline at end of file" marker that follows it kept on the same entry.
type Entry = { hunk: Hunk; index: number; lines: string[] };

type ParsedPatch = { preamble: string[]; hunks: Hunk[]; entries: Entry[] };

const hunkHeader = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/;

function parsePatch(patch: string): ParsedPatch {
  const parsed: ParsedPatch = { preamble: [], hunks: [], entries: [] };

  for (const line of patch.split('\n')) addLine(parsed, line);

  return parsed;
}

function addLine(parsed: ParsedPatch, line: string): void {
  const header = hunkHeader.exec(line);

  if (line === '') return;

  if (header) return void parsed.hunks.push(hunkOf(header, line));
  addContentLine(parsed, line);
}

function addContentLine(parsed: ParsedPatch, line: string): void {
  if (!parsed.hunks.length) return void parsed.preamble.push(line);

  if (line.startsWith('\\')) return addMarker(parsed, line);
  addHunkEntry(parsed, line);
}

function addMarker(parsed: ParsedPatch, line: string): void {
  parsed.entries.at(-1)?.lines.push(line);
}

function addHunkEntry(parsed: ParsedPatch, line: string): void {
  const hunk = parsed.hunks.at(-1);

  if (!hunk) return;
  const entry = { hunk, index: hunk.entries.length, lines: [line] };

  hunk.entries.push(entry);
  parsed.entries.push(entry);
}

const hunkOf = (header: RegExpExecArray, line: string): Hunk => ({
  oldStart: Number(header[1]),
  newStart: Number(header[2]),
  section: header[3] ?? '',
  header: line,
  entries: [],
});

const countsOld = (line: string): boolean =>
  line.startsWith(' ') || line.startsWith('-');

const countsNew = (line: string): boolean =>
  line.startsWith(' ') || line.startsWith('+');

const firstLines = (entries: Entry[]): string[] =>
  entries.map((entry) => entry.lines[0] ?? '');

// A hunk cut by a page boundary gets a header of its own, numbered from where the cut falls.
function pieceHeader(hunk: Hunk, before: Entry[], piece: Entry[]): string {
  const old = firstLines(before).filter(countsOld).length;
  const added = firstLines(before).filter(countsNew).length;
  const oldCount = firstLines(piece).filter(countsOld).length;
  const newCount = firstLines(piece).filter(countsNew).length;

  return `@@ -${hunk.oldStart + old},${oldCount} +${hunk.newStart + added},${newCount} @@${hunk.section}`;
}

const isWholeHunk = (hunk: Hunk, piece: Entry[], start: number): boolean =>
  start === 0 && piece.length === hunk.entries.length;

function firstIndex(piece: Entry[]): number {
  return piece[0]?.index ?? 0;
}

function hunkPiece(hunk: Hunk, piece: Entry[]): string[] {
  const start = firstIndex(piece);
  const whole = isWholeHunk(hunk, piece, start);

  const header = whole
    ? hunk.header
    : pieceHeader(hunk, hunk.entries.slice(0, start), piece);

  return [header, ...piece.flatMap((entry) => entry.lines)];
}

function pageLines(entries: Entry[]): string[] {
  const hunks = [...new Set(entries.map((entry) => entry.hunk))];

  return hunks.flatMap((hunk) =>
    hunkPiece(
      hunk,
      entries.filter((entry) => entry.hunk === hunk),
    ),
  );
}

/*
 * Every page repeats the file's header lines, so each parses on its own; the cursor counts diff lines, never hunks,
 * so one long hunk, such as a new file's, still arrives in pages.
 */
export function pagePatch(
  patch: string,
  cursor: number,
  limit: number,
): PatchPage {
  const parsed = parsePatch(patch);
  const end = cursor + limit;

  return {
    patch: pageText(parsed, cursor, end),
    nextCursor: end < parsed.entries.length ? end : null,
  };
}

function pageText(parsed: ParsedPatch, cursor: number, end: number): string {
  const lines = [
    ...parsed.preamble,
    ...pageLines(parsed.entries.slice(cursor, end)),
  ];

  return `${lines.join('\n')}\n`;
}
