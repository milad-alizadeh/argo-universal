import type * as React from 'react';
import { type ReactNode, useState } from 'react';
import { cn } from '#lib/generic/utils';
import { CodeBlockHeader } from '#lib/product/markdown/code-block-header';
import { codeBlockGroup } from '#lib/product/markdown/copy-button';
import { contentActionClass } from '#primitives/actions/button';
import { Pressable } from '#primitives/actions/pressable';
import { Text } from '#primitives/content/text';
import {
  Collapsible,
  CollapsibleContent,
} from '#primitives/layout/collapsible';
import type { FileDiff } from '../../view/file-diff';
import { FileHeader, type FileHeaderProps } from './diff-file-header';
import { DiffScroll } from './diff-hunks';
import {
  countLines,
  patchText,
  previewHunks,
  previewLineCount,
} from './diff-lines';

export interface DiffViewProps {
  file: FileDiff;
  inline?: boolean;
  // Inspector only: the file's Viewed mark. Marking a file viewed folds it; clearing the mark opens it.
  viewed?: boolean;
  onViewedChange?: (viewed: boolean) => void;
}

interface DiffPreview {
  lineCount: number;
  limited: boolean;
  hunks: FileDiff['hunks'];
  onShowAll: () => void;
}

interface DiffViewState extends FileHeaderProps {
  inline: boolean;
  preview: DiffPreview;
}

const showAllClassName = contentActionClass({
  variant: 'link',
  className: 'h-6 sm:h-6 justify-start rounded-none bg-content px-3 py-0',
});

const showAllTextClassName =
  'select-none text-muted-foreground no-underline group-hover:no-underline group-active:no-underline';

function useDiffPreview(file: FileDiff, inline: boolean): DiffPreview {
  const [showAll, setShowAll] = useState(false);
  const lineCount = countLines(file.hunks);
  const limited = inline && !showAll && lineCount > previewLineCount;

  return {
    lineCount,
    limited,
    hunks: previewHunks(file.hunks, limited),
    onShowAll: () => setShowAll(true),
  };
}

function useDiffViewState(props: DiffViewProps): DiffViewState {
  const inline = props.inline === true;
  const [open, setOpen] = useViewedFold(props.viewed);
  const preview = useDiffPreview(props.file, inline);

  return {
    file: props.file,
    inline,
    open,
    onOpenChange: setOpen,
    viewed: props.viewed,
    onViewedChange: viewedChange(props.onViewedChange, setOpen),
    preview,
  };
}

// The fold follows the Viewed mark whenever it changes, here or from the owner, such as marks that load after the files.
function useViewedFold(
  viewed: boolean | undefined,
): readonly [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(!viewed);
  const [shownViewed, setShownViewed] = useState(viewed);

  if (viewed !== shownViewed) {
    setShownViewed(viewed);
    setOpen(!viewed);
  }

  return [open, setOpen] as const;
}

function viewedChange(
  onViewedChange: DiffViewProps['onViewedChange'],
  setOpen: (open: boolean) => void,
): FileHeaderProps['onViewedChange'] {
  if (!onViewedChange) return undefined;

  return (viewed) => {
    setOpen(!viewed);
    onViewedChange(viewed);
  };
}

function ShowAllLines(props: DiffPreview): React.JSX.Element | null {
  if (!props.limited) return null;

  return (
    <Pressable
      onPress={props.onShowAll}
      role="button"
      className={showAllClassName}
    >
      <Text selectable={false} className={showAllTextClassName}>
        Show all {props.lineCount} lines
      </Text>
    </Pressable>
  );
}

function DiffHeader(props: DiffViewState): React.JSX.Element {
  return props.inline ? (
    <CodeBlockHeader
      title={props.file.path}
      copyValue={patchText(props.file.hunks)}
    />
  ) : (
    <FileHeader {...props} />
  );
}

const diffClassName = (inline: boolean): string =>
  cn(
    'min-w-0',
    codeBlockGroup,
    inline && 'overflow-hidden rounded-2xl bg-tint px-1 pb-1',
  );

function DiffFrame(
  props: DiffViewState & { children: ReactNode },
): React.JSX.Element {
  return (
    <Collapsible
      open={props.open}
      className={diffClassName(props.inline)}
      testID="diff-view"
    >
      {props.children}
    </Collapsible>
  );
}

// The same hunk rendering is used inline in the Feed and under a file header in the Inspector.
export function DiffView(props: DiffViewProps): React.JSX.Element {
  const view = useDiffViewState(props);

  return (
    <DiffFrame {...view}>
      <DiffHeader {...view} />
      <CollapsibleContent className={diffContentClass(view.inline)}>
        <DiffScroll hunks={view.preview.hunks} inline={view.inline} />
        <ShowAllLines {...view.preview} />
      </CollapsibleContent>
    </DiffFrame>
  );
}

function diffContentClass(inline: boolean | undefined): string | undefined {
  return inline ? 'overflow-hidden rounded-xl bg-content' : undefined;
}
