import type { StructuredPatchHunk } from 'diff';

interface DiffLine {
  kind: 'context' | 'added' | 'removed' | 'note';
  number: number | null;
  text: string;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

class HunkLines {
  private oldNumber: number;
  private newNumber: number;

  public constructor(hunk: StructuredPatchHunk) {
    this.oldNumber = hunk.oldStart;
    this.newNumber = hunk.newStart;
  }

  public read(line: string): DiffLine {
    if (line.startsWith('+'))
      return { kind: 'added', number: this.newNumber++, text: line.slice(1) };

    if (line.startsWith('-'))
      return { kind: 'removed', number: this.oldNumber++, text: line.slice(1) };

    return this.readContext(line);
  }

  private readContext(line: string): DiffLine {
    if (line.startsWith('\\'))
      return { kind: 'note', number: null, text: line };
    this.oldNumber += 1;

    return { kind: 'context', number: this.newNumber++, text: line.slice(1) };
  }
}

export function toDiffHunk(hunk: StructuredPatchHunk): DiffHunk {
  const reader = new HunkLines(hunk);

  return {
    header: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
    lines: hunk.lines.map((line) => reader.read(line)),
  };
}

export interface ChangedLineCounts {
  added: number;
  removed: number;
}

export function changedLineCounts(hunks: DiffHunk[]): ChangedLineCounts {
  const lines = hunks.flatMap((hunk) => hunk.lines);

  return {
    added: lines.filter((line) => line.kind === 'added').length,
    removed: lines.filter((line) => line.kind === 'removed').length,
  };
}
