import { useRef, useState } from 'react';
import type { InspectorProps } from '#primitives/scaffolds/inspector';
import type { ChangesViewProps } from './changes-view-props';

type Selection = { comparison: string; path: string } | undefined;

type ChangesStage = {
  changes: ChangesViewProps | undefined;
  scrollState: InspectorProps['scrollState'];
};

// The Stage owns its drill-in and each page's scroll position, even while another tab is shown.
export function useChangesStage(
  props: ChangesViewProps | undefined,
): ChangesStage {
  const [selection, select] = useState<Selection>();
  const comparison = comparisonKey(props);
  const selectedFile = selectedPath(props, selection, comparison);

  const scrollState = usePageScroll(pageKey(comparison, selectedFile));

  const onFileSelect = (path?: string): void =>
    select(selectionOf(comparison, path));

  return {
    changes: props && { ...props, selectedFile, onFileSelect },
    scrollState,
  };
}

function selectedPath(
  props: ChangesViewProps | undefined,
  selection: Selection,
  comparison: string,
): string | undefined {
  const path = selectionPath(selection, comparison);

  return filesOf(props).find((file) => file.path === path)?.path;
}

const comparisonKey = (props: ChangesViewProps | undefined): string =>
  JSON.stringify(props?.comparison ?? null);

const pageKey = (comparison: string, path?: string): string =>
  `changes:${comparison}:${path ?? ''}`;

const filesOf = (
  props: ChangesViewProps | undefined,
): NonNullable<ChangesViewProps['files']> => props?.files ?? [];

function selectionPath(
  selection: Selection,
  comparison: string,
): string | undefined {
  if (!selection) return undefined;

  return selection.comparison === comparison ? selection.path : undefined;
}

const selectionOf = (comparison: string, path?: string): Selection =>
  path === undefined ? undefined : { comparison, path };

function usePageScroll(
  key: string,
): NonNullable<InspectorProps['scrollState']> {
  const offsets = useRef(new Map<string, number>());

  return {
    key,
    getOffset: () => offsets.current.get(key) ?? 0,
    onScroll: (offset) => offsets.current.set(key, offset),
  };
}
