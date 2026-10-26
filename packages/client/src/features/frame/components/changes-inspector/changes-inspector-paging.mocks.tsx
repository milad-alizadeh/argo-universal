import type * as React from 'react';
import { useEffect, useState } from 'react';
import type { ChangesViewProps, FileDiffPages } from '#features/changes';
import type { FileDiff } from '#features/feed';
import {
  ChangesInspector,
  type ChangesInspectorProps,
} from './changes-inspector';
import { loadedChanges } from './changes-inspector.mocks';

// Smaller than the Server's pages, so a story reaches the end of each in a few scrolls.
export const pagingFiles = 20;

export const pagingLines = 20;

// Long enough for the spinner to show, short enough for a test.
const answerAfter = 300;

type Hunks = FileDiff['hunks'];

type Entry = { hunk: number; line: Hunks[number]['lines'][number] };

// A file's hunks cut into pages of lines, each piece under its hunk's header, as the Server pages a patch.
export function linePages(hunks: Hunks, lines: number): Hunks[] {
  const entries: Entry[] = hunks.flatMap((hunk, index) =>
    hunk.lines.map((line) => ({ hunk: index, line })),
  );

  return Array.from({ length: Math.ceil(entries.length / lines) }, (_, page) =>
    pageHunks(hunks, entries.slice(page * lines, (page + 1) * lines)),
  );
}

function pageHunks(hunks: Hunks, entries: Entry[]): Hunks {
  const groups = Map.groupBy(entries, (entry) => entry.hunk);

  return [...groups].map(([index, piece]) => ({
    header: hunks[index]?.header ?? '',
    lines: piece.map((entry) => entry.line),
  }));
}

// How many pages of each list were asked for, and how many have arrived, by list.
type Counts = Readonly<Record<string, number>>;

interface Paging {
  asked: Counts;
  answered: Counts;
  ask: (key: string, pages: number) => void;
}

const countOf = (counts: Counts, key: string): number => counts[key] ?? 0;

type Later = (answer: () => void) => void;

function clearAll(timers: Set<ReturnType<typeof setTimeout>>): void {
  for (const timer of timers) clearTimeout(timer);
}

function useLater(): Later {
  const [timers] = useState(() => new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => (): void => clearAll(timers), [timers]);

  return (answer) => {
    timers.add(setTimeout(answer, answerAfter));
  };
}

// Asking again for as many pages, or fewer, does nothing; a page asked for arrives a moment later.
function usePaging(initial: Counts): Paging {
  const later = useLater();
  const [asked, setAsked] = useState(initial);
  const [answered, setAnswered] = useState(initial);

  const ask = (key: string, pages: number): void => {
    if (countOf(asked, key) >= pages) return;

    setAsked((last) => ({ ...last, [key]: pages }));
    later(() => setAnswered((last) => ({ ...last, [key]: pages })));
  };

  return { asked, answered, ask };
}

const filesKey = 'files';

function diffOf(file: FileDiff, diffs: Paging): FileDiffPages {
  const all = linePages(file.hunks, pagingLines);
  const answered = countOf(diffs.answered, file.path);

  return {
    pages: all.slice(0, answered),
    loading: countOf(diffs.asked, file.path) > answered,
    more: answered < all.length,
  };
}

type Paged = Pick<
  ChangesViewProps,
  'files' | 'summary' | 'moreFiles' | 'onLoadMoreFiles' | 'diffs' | 'onLoadDiff'
>;

const sentDiffs = (sent: FileDiff[], diffs: Paging): Paged['diffs'] =>
  Object.fromEntries(sent.map((file) => [file.path, diffOf(file, diffs)]));

type Server = { source: readonly FileDiff[]; files: Paging; diffs: Paging };

function pagedProps({ source, files, diffs }: Server): Paged {
  const pages = countOf(files.answered, filesKey);
  const sent = source.slice(0, pages * pagingFiles);

  return {
    ...loadedChanges(sent),
    summary: loadedChanges(source).summary,
    moreFiles: sent.length < source.length,
    onLoadMoreFiles: () => files.ask(filesKey, pages + 1),
    diffs: sentDiffs(sent, diffs),
    onLoadDiff: diffs.ask,
  };
}

type PagedProps = ChangesInspectorProps & { source: readonly FileDiff[] };

// The Inspector over a stand-in for the Server: files and each opened diff arrive in pages, a moment after the list asks.
export function PagedChangesInspector({
  source,
  ...props
}: PagedProps): React.JSX.Element {
  const files = usePaging({ [filesKey]: 1 });
  const diffs = usePaging({});

  return (
    <ChangesInspector {...props} {...pagedProps({ source, files, diffs })} />
  );
}
