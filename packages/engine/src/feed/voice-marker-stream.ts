import { markerOf, voiceMarkers, withoutMarks } from './voice-markers';

const couldBecomeMark = (text: string): boolean =>
  text.length > 0 &&
  voiceMarkers.some((marker) => marker !== text && marker.startsWith(text));

// How much of the text is known: all of it, unless its last line starts with what could still become a mark.
function knownLength(text: string): number {
  const lineStart = text.lastIndexOf('\n') + 1;
  const line = text.slice(lineStart);
  const start = lineStart + line.length - line.trimStart().length;

  return couldBecomeMark(text.slice(start)) ? start : text.length;
}

const leadingMark = /^[ \t]*\[(?:STATUS|COMPLETE|ANALYSIS)\][ \t]*/;

const leadingSpace = /^[ \t]*/;

// Whether a line could still open with a mark: nothing but spaces yet, or only the start of a mark.
const couldStillOpenWithMark = (line: string): boolean => {
  const head = line.replace(leadingSpace, '');

  return (
    head.length === 0 || voiceMarkers.some((mark) => mark.startsWith(head))
  );
};

// The opening line after the mark that opens the message, which `withoutMarks` trims; any other line as it is.
const afterOpeningMark = (line: string, opening: boolean): string => {
  const mark = opening ? markerOf(line) : undefined;

  return mark ? line.slice(mark.length).trimStart() : line;
};

// A mark at its start with a character after its spaces, or a start no mark can still take.
const settledStart = (line: string): boolean => {
  const marked = leadingMark.exec(line);

  return marked
    ? marked[0].length < line.length
    : !couldStillOpenWithMark(line);
};

/*
 * Whether the start of a line is settled: whatever is appended to it without a line break shows as it is, because no
 * mark can still open the line and a mark that did has a character after its spaces. Only then may a chunk skip
 * `withoutMarks`, which reads the whole line.
 */
const settledLine = (line: string, opening: boolean): boolean =>
  !line.includes('\n') &&
  line.trimStart().length > 0 &&
  settledStart(afterOpeningMark(line, opening));

/*
 * The visible text of a message that arrives in chunks. A line whose start could still become a mark is held back, so
 * a mark split across chunks never shows; once a line's start is known the rest of it passes as it comes. Only the
 * last line is read again, and only until its start is settled: the lines before it are let go once the message's
 * opening is known, and later chunks of a settled line pass without reading it again, so a long line costs its length
 * once rather than once per chunk.
 */
export class VoiceMarkerStream {
  // The message's text from the start of a line on; the opening line until the opening is known. Empty while settled.
  private text = '';
  private opening = true;
  // How much of the visible text of `text` was already given out.
  private shown = 0;
  // The start of the current line is settled and all of it was given out, so its text is let go.
  private settled = false;

  public push(chunk: string): string {
    if (!this.settled) {
      this.text += chunk;

      return this.read();
    }

    return this.pushSettled(chunk);
  }

  // The settled line shows as it comes up to its line break; what follows the break starts a line of its own.
  private pushSettled(chunk: string): string {
    const lineEnd = chunk.indexOf('\n') + 1;

    if (lineEnd === 0) return chunk;
    this.settled = false;
    this.opening = false;
    this.shown = 0;
    this.text = chunk.slice(lineEnd);

    return chunk.slice(0, lineEnd) + this.read();
  }

  private read(): string {
    const length = knownLength(this.text);
    const visible = withoutMarks(this.text.slice(0, length), this.opening);
    const added = visible.slice(this.shown);
    const allKnown = length === this.text.length;
    this.shown = visible.length;
    this.letGoOfLines(visible);
    this.settled = this.isSettled(allKnown);

    if (this.settled) this.text = '';

    return added;
  }

  private isSettled(allKnown: boolean): boolean {
    return allKnown && this.shown > 0 && settledLine(this.text, this.opening);
  }

  // An opening that shows nothing yet may still be trimmed, so its lines are kept until it shows something.
  private letGoOfLines(visible: string): void {
    const lineStart = this.text.lastIndexOf('\n') + 1;

    if (lineStart === 0 || visible.length === 0) return;
    const before = this.text.slice(0, lineStart);
    this.shown -= withoutMarks(before, this.opening).length;
    this.text = this.text.slice(lineStart);
    this.opening = false;
  }
}
