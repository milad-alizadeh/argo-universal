import { createElement, type JSX, useCallback, useEffect, useRef } from 'react';
import type { ComposerProps } from '#features/composer';
import type { FeedProps } from '#features/feed';
import { SubagentSheet, type SubagentListProps } from '#features/sessions';
import { SizeClass } from '../../../lib/generic/size-class/size-class';

type SheetProps = {
  subagents: SubagentListProps | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// The parts a Session draws differently once it has Subagents: its Composer and its Feed.
type SubagentParts = { composer: ComposerProps; feed: FeedProps };

type SubagentPresentation = {
  parts: SubagentParts;
  sheet: JSX.Element | null;
};

function workStatus(
  subagents: SubagentListProps,
  open: () => void,
): NonNullable<ComposerProps['status']>['subagents'] {
  return {
    count: subagents.subagents.length,
    running: subagents.subagents.some((item) => item.state !== 'idle'),
    onPress: open,
  };
}

function composerWithSubagents(
  composer: ComposerProps,
  subagents: SubagentListProps | undefined,
  open: () => void,
): ComposerProps {
  if (!subagents?.subagents.length) return composer;

  return {
    ...composer,
    status: { ...composer.status, subagents: workStatus(subagents, open) },
  };
}

function selectAndClose(
  subagents: SubagentListProps,
  onOpenChange: SheetProps['onOpenChange'],
): SubagentListProps['onSelect'] {
  if (!subagents.onSelect) return undefined;

  return (selected) => {
    onOpenChange(false);
    subagents.onSelect?.(selected);
  };
}

function SessionSubagentSheet({
  subagents,
  open,
  onOpenChange,
}: SheetProps): JSX.Element | null {
  if (!subagents?.subagents.length) return null;

  const onSelect = selectAndClose(subagents, onOpenChange);

  return createElement(SubagentSheet, {
    ...subagents,
    open,
    onOpenChange,
    onSelect,
  });
}

// A Feed row opens the Subagents list, whatever child it names: Argo has no per-Subagent route yet (#82).
const feedWithSubagents = (
  feed: FeedProps,
  subagents: SubagentListProps | undefined,
  open: () => void,
): FeedProps =>
  subagents?.subagents.length ? { ...feed, onOpenSubagent: open } : feed;

// Below wide the list has no Inspector to sit in, so it opens as a Sheet over the Session.
const subagentSheet = (
  subagents: SubagentListProps | undefined,
  sheetProps: Pick<SheetProps, 'open' | 'onOpenChange'>,
): JSX.Element => (
  <SizeClass only="compact">
    <SessionSubagentSheet subagents={subagents} {...sheetProps} />
  </SizeClass>
);

// The Feed memoises its rows on their props, so the opener it carries keeps one identity for the Session's life.
function useShowSubagents(
  onOpenChange: SheetProps['onOpenChange'],
): () => void {
  const latest = useRef(onOpenChange);

  useEffect(() => {
    latest.current = onOpenChange;
  }, [onOpenChange]);

  return useCallback(() => latest.current(true), []);
}

export function useSessionSubagents(
  parts: SubagentParts,
  subagents: SubagentListProps | undefined,
  sheetProps: Pick<SheetProps, 'open' | 'onOpenChange'>,
): SubagentPresentation {
  const show = useShowSubagents(sheetProps.onOpenChange);

  return {
    parts: {
      composer: composerWithSubagents(parts.composer, subagents, show),
      feed: feedWithSubagents(parts.feed, subagents, show),
    },
    sheet: subagentSheet(subagents, sheetProps),
  };
}
