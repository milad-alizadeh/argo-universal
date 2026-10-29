import { layoutWidths } from '@repo/kit/mocks/story-layout';
import { type JSX, useState } from 'react';
import { View } from 'react-native';
import { expect, screen, waitFor } from 'storybook/test';
import { type ChangesViewProps, useChanges } from '#features/changes';
import type { FileDiff } from '#features/feed';
import { type SessionHeaderProps, useSessionPanels } from '#features/sessions';
import { recordedFile } from '../../../../mocks/feed-edit-mock';
import {
  type MemoryCatalog,
  memoryChanges,
} from '../../../features/changes/source/memory-changes.mocks';
import { SessionInspector } from './session-inspector';

const branchNames = [
  'main',
  'release/2.4',
  'feature/inspector-tabs',
  'fix/diff-scroll',
  'chore/bump-expo',
];

// The long modified file of the recorded edits.
export const largeFile = '/repo/large.txt';

export const shortFile = '/repo/src/feed.ts';

// Recorded edits: a long modified file, a short one, an added file and a deleted one, each at its own path.
const fewFiles: FileDiff[] = [
  recordedFile('agent-2', 'edit-states'),
  { ...recordedFile('agent-1'), path: shortFile },
  {
    ...recordedFile('agent-1', 'edit-and-command', 'add'),
    path: '/repo/src/new-file.ts',
  },
  recordedFile('agent-2', 'edit-states', 'delete'),
];

// One recorded edit under many paths: the same list, only longer.
const manyFiles: FileDiff[] = Array.from({ length: 60 }, (_, index) => ({
  ...recordedFile('agent-1'),
  path: `/repo/src/module-${index + 1}/index.ts`,
}));

if (fewFiles[0]?.path !== largeFile)
  throw new Error('Recorded catalog needs the long file first');

const always =
  (files: readonly FileDiff[]): MemoryCatalog['files'] =>
  () =>
    files;

const onMain =
  (files: readonly FileDiff[]): MemoryCatalog['files'] =>
  (comparison) =>
    comparison === 'main' ? files : [];

const catalog = (files: MemoryCatalog['files']): MemoryCatalog => ({
  files,
  mainBranch: 'main',
  branches: branchNames,
});

export const fewChanges = catalog(always(fewFiles));

export const manyChanges = catalog(always(manyFiles));

// The few files against main, and nothing against anything else.
export const changesOnMain = catalog(onMain(fewFiles));

export const noChanges = catalog(always([]));

// The same file twice, as two pages can send it: the list and its counts take it once.
export const repeatedChanges = catalog(always([...fewFiles, ...fewFiles]));

// A comparison the Server has not answered yet.
export const loadingChanges = catalog(() => {});

const loadError = "Git couldn't find main.";

export const unloadableChanges = { ...loadingChanges, loadError };

// A refresh that failed after the files loaded.
export const staleChanges = { ...fewChanges, loadError };

// Smaller pages than the Server's, so a story reaches the end of each in a few scrolls.
export const pagedChanges = {
  ...catalog(always([...fewFiles, ...manyFiles])),
  filesPerPage: 20,
  linesPerPage: 20,
};

const noRevision = {};

// A Session's Changes over an in-memory Server, as the screen reads them from the real one.
export function useMemoryChanges(
  memory: MemoryCatalog,
  open = true,
): ChangesViewProps {
  const [source] = useState(() => memoryChanges(memory));

  return useChanges(
    { sessionId: 'memory-session', open, revision: noRevision },
    source,
  );
}

interface MemoryInspectorProps {
  catalog: MemoryCatalog;
  header?: SessionHeaderProps;
}

// The Session's Inspector with its Changes tab shown: the Inspector when wide, the sheet on a phone.
export function MemoryChangesInspector(
  props: MemoryInspectorProps,
): JSX.Element {
  const panels = useSessionPanels(['changes']);
  const [shown, setShown] = useState(false);

  if (!shown) {
    panels.select('changes');
    setShown(true);
  }

  const changes = useMemoryChanges(
    props.catalog,
    panels.state.shown === 'changes',
  );

  return (
    <View className="h-175 w-full flex-row">
      <SessionInspector
        panels={panels}
        changes={changes}
        header={props.header}
      />
    </View>
  );
}

export const widths = [layoutWidths.phone, layoutWidths.wide];

export const allChanges = 'All Changes (vs main)';

// The picker's pill is named by its title and shows the chosen comparison.
export async function picker(label: string): Promise<HTMLElement> {
  const trigger = await screen.findByRole('button', { name: /^Comparison/ });
  await expect(trigger).toHaveTextContent(label);

  return trigger;
}

export const fileHeader = (path: string): HTMLElement =>
  screen.getByRole('button', { name: `Diff for ${path}` });

export const findFileHeader = (path: string): Promise<HTMLElement> =>
  screen.findByRole('button', { name: `Diff for ${path}` });

export const fileHeaders = (): HTMLElement[] =>
  screen.getAllByRole('button', { name: /^Diff for / });

// The drawn file headers and diff lines: an open file is mostly its lines, so the list's end is often one of them.
export const drawnRows = (): HTMLElement[] => [
  ...screen.queryAllByRole('button', { name: /^Diff for / }),
  ...screen.queryAllByTestId('diff-line'),
];

// Legend List places its rows itself, so the lowest on screen is not the last in the document.
const lowest = (rows: HTMLElement[]): HTMLElement | undefined =>
  rows
    .toSorted(
      (a, b) =>
        a.getBoundingClientRect().bottom - b.getBoundingClientRect().bottom,
    )
    .at(-1);

// Brings the lowest drawn row to the top until `done` holds, a screen at a time, so the list draws or asks for what comes next.
export async function scrollUntil(
  rows: () => HTMLElement[],
  done: () => boolean,
): Promise<void> {
  await waitFor(
    () => {
      lowest(rows())?.scrollIntoView({ block: 'start' });

      if (!done()) throw new Error('Still scrolling');
    },
    { timeout: 20_000, interval: 100 },
  );
}

// The file list draws only the rows near the viewport, so a far file's header appears once the list scrolls to it.
export async function scrollToFile(path: string): Promise<HTMLElement> {
  await scrollUntil(
    drawnRows,
    () => screen.queryByRole('button', { name: `Diff for ${path}` }) !== null,
  );

  return fileHeader(path);
}
