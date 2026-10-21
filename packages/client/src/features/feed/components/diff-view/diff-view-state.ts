import { useState } from 'react';
import type { FileDiff } from '../../view/file-diff';
import type { FileHeaderProps } from './diff-file-header';
import { countLines, previewHunks, previewLineCount } from './diff-lines';

export interface DiffViewProps {
  file: FileDiff;
  inline?: boolean;
  // Inspector only: the file's Viewed mark. Marking a file viewed folds it; clearing the mark opens it.
  viewed?: boolean;
  onViewedChange?: (viewed: boolean) => void;
}

// An inline diff shows its first lines and offers the rest; elsewhere the whole patch is already drawn.
export interface DiffPreview {
  lineCount: number;
  limited: boolean;
  hunks: FileDiff['hunks'];
  onShowAll: () => void;
}

export interface DiffViewState extends FileHeaderProps {
  inline: boolean;
  preview: DiffPreview;
}

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

export function useDiffViewState(props: DiffViewProps): DiffViewState {
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
