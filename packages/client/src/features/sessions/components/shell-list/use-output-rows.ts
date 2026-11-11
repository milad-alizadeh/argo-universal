import { useState } from 'react';
import type { ShellLine } from './shell-output-lines';
import { readShellOutput, type ShellOutputRead } from './shell-output-read';

// One line of output as the List draws it, keyed by its place.
export interface OutputRow {
  key: string;
  spans: ShellLine;
}

interface OutputRows {
  read: ShellOutputRead;
  rows: OutputRow[];
}

// A line already read keeps its row, so a growing output leaves the rows already drawn alone.
function keptRows(read: ShellOutputRead, previous: OutputRow[]): OutputRow[] {
  return read.lines.map((spans, at) =>
    previous[at]?.spans === spans ? previous[at] : { key: String(at), spans },
  );
}

function rowsFor(text: string, previous: OutputRows): OutputRows {
  const read = readShellOutput(text, previous.read);

  return { read, rows: keptRows(read, previous.rows) };
}

const noRows: OutputRows = { read: readShellOutput(''), rows: [] };

// Each chunk reads only what it added: the previous read is kept from the last render.
export function useOutputRows(text: string): OutputRow[] {
  const [shown, setShown] = useState(() => rowsFor(text, noRows));

  if (shown.read.text === text) return shown.rows;

  const next = rowsFor(text, shown);

  setShown(next);

  return next.rows;
}
