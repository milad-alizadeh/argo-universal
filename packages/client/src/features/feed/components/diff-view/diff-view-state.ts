import { useState } from 'react';
import type { FileDiff } from '../../view/file-diff';
import type { FileHeaderProps } from './diff-file-header';

export interface DiffViewProps {
  file: FileDiff;
  inline?: boolean;
  // A file opened directly from the Inspector list reveals its diff even when already viewed.
  initialOpen?: boolean;
  // Inspector only: the file's Viewed mark. Marking a file viewed folds it; clearing the mark opens it.
  viewed?: boolean;
  onViewedChange?: (viewed: boolean) => void;
}

export type DiffViewState = FileHeaderProps & { file: FileDiff };

// The fold follows the Viewed mark whenever it changes, here or from the owner, such as marks that load after the files.
function useViewedFold(
  viewed: boolean | undefined,
  initialOpen: boolean | undefined,
): readonly [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(initialOpen ?? !viewed);
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
  const [open, setOpen] = useViewedFold(props.viewed, props.initialOpen);

  return {
    file: props.file,
    open,
    onOpenChange: setOpen,
    viewed: props.viewed,
    onViewedChange: viewedChange(props.onViewedChange, setOpen),
  };
}
