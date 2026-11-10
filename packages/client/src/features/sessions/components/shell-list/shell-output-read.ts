import {
  type Pen,
  plainPen,
  readLines,
  type ShellLine,
} from './shell-output-lines';

// Output read so far. Lines before the last newline are finished: a carriage return after it cannot redraw them.
export interface ShellOutputRead {
  text: string;
  lines: ShellLine[];
  finished: ShellLine[];
  finishedEnd: number;
  // The colour the finished lines leave set.
  pen: Pen;
}

type Finished = Pick<ShellOutputRead, 'finished' | 'finishedEnd' | 'pen'>;

const nothingRead: ShellOutputRead = {
  text: '',
  lines: [],
  finished: [],
  finishedEnd: 0,
  pen: plainPen,
};

// Reads on from where the previous read finished, keeping the lines it already read.
function finishedLines(text: string, previous: Finished): Finished {
  const end = text.lastIndexOf('\n') + 1;

  if (end <= previous.finishedEnd) return previous;

  const read = readLines(
    text.slice(previous.finishedEnd, end - 1),
    previous.pen,
  );

  return {
    finished: [...previous.finished, ...read.lines],
    finishedEnd: end,
    pen: read.pen,
  };
}

// The line still being written follows the finished ones. Output that ends on a newline has none, unless it has no lines at all.
function withTail(done: Finished, tail: string): ShellLine[] {
  if (tail === '' && done.finished.length > 0) return done.finished;

  return [...done.finished, ...readLines(tail, done.pen).lines];
}

function readFrom(text: string, previous: ShellOutputRead): ShellOutputRead {
  const done = finishedLines(text, previous);
  const { finished, finishedEnd, pen } = done;

  return {
    text,
    lines: withTail(done, text.slice(finishedEnd)),
    finished,
    finishedEnd,
    pen,
  };
}

// Output that grew from `previous` reads only what it added, and its finished lines keep their objects; any other text is read whole.
export function readShellOutput(
  text: string,
  previous: ShellOutputRead = nothingRead,
): ShellOutputRead {
  return readFrom(
    text,
    text.startsWith(previous.text) ? previous : nothingRead,
  );
}

// A Shell's output as lines of coloured spans.
export const shellOutputLines = (text: string): ShellLine[] =>
  readShellOutput(text).lines;
