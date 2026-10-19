import { createElement, useState, type JSX } from 'react';
import type { ComposerProps } from '#features/composer';
import { SubagentSheet, type SubagentListProps } from '#features/sessions';

type SheetProps = {
  subagents: SubagentListProps | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SubagentPresentation = {
  composer: ComposerProps;
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

export function useSessionSubagents(
  composer: ComposerProps,
  subagents: SubagentListProps | undefined,
): SubagentPresentation {
  const [open, onOpenChange] = useState(false);
  const show = (): void => onOpenChange(true);

  return {
    composer: composerWithSubagents(composer, subagents, show),
    sheet: createElement(SessionSubagentSheet, {
      subagents,
      open,
      onOpenChange,
    }),
  };
}
