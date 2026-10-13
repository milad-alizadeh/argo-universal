import { useEffect } from 'react';
import type { DroppedFiles, FileDropOptions } from './use-file-drop';

const carriesFiles = (event: DragEvent): boolean =>
  event.dataTransfer?.types.includes('Files') ?? false;

const isFolder = (item: DataTransferItem): boolean =>
  item.webkitGetAsEntry()?.isDirectory ?? false;

// A browser lists a dropped folder as a file it can't read, so folders are told apart by their entry.
const droppedFiles = (transfer: DataTransfer): DroppedFiles => {
  const items = [...transfer.items].filter((item) => item.kind === 'file');
  const files = items.filter((item) => !isFolder(item));

  return {
    files: files.flatMap((item) => item.getAsFile() ?? []),
    folders: items.length - files.length,
  };
};

const allowDrop = (event: DragEvent): void => {
  if (!carriesFiles(event)) return;
  event.preventDefault();

  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
};

const dropOn =
  (onDropFiles: (dropped: DroppedFiles) => void) =>
  (event: DragEvent): void => {
    if (!event.dataTransfer || !carriesFiles(event)) return;
    event.preventDefault();
    onDropFiles(droppedFiles(event.dataTransfer));
  };

// Files dragged from the desktop or another window attach to the draft; anything else is left to the page.
export function useFileDrop({ targetId, onDropFiles }: FileDropOptions): void {
  useEffect(() => {
    const target = document.getElementById(targetId);

    if (!target || !onDropFiles) return;
    const drop = dropOn(onDropFiles);
    target.addEventListener('dragover', allowDrop);
    target.addEventListener('drop', drop);

    return (): void => {
      target.removeEventListener('dragover', allowDrop);
      target.removeEventListener('drop', drop);
    };
  }, [targetId, onDropFiles]);
}
