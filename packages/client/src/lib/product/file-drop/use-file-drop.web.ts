import { useCallback, useEffect, useRef, useState } from 'react';
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

type DragType = 'dragenter' | 'dragleave' | 'dragover' | 'drop';

type Stop = () => void;

function listen(
  target: GlobalEventHandlers,
  type: DragType,
  listener: (event: DragEvent) => void,
): Stop {
  target.addEventListener(type, listener);

  return (): void => target.removeEventListener(type, listener);
}

function listenForEscape(onEscape: () => void): Stop {
  const listener = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') onEscape();
  };

  window.addEventListener('keydown', listener);

  return (): void => window.removeEventListener('keydown', listener);
}

type ChangeCount = (change: (entered: number) => number) => void;

// Counts only drags that carry files, so other drags never arm the target.
const countFileDrags =
  (count: ChangeCount, change: (entered: number) => number) =>
  (event: DragEvent): void => {
    if (carriesFiles(event)) count(change);
  };

const enterOne = (entered: number): number => entered + 1;

const leaveOne = (entered: number): number => entered - 1;

const leaveAll = (): number => 0;

/*
 * Every element the pointer crosses fires its own dragenter and dragleave, the next one's enter before the last one's leave,
 * so a count of the elements entered stays above zero until the files leave the window.
 * They also stop being over it when they drop anywhere, or when Esc cancels the drag.
 */
function watchFilesOverWindow(onChange: (over: boolean) => void): Stop {
  const count = enteredCount(onChange);

  return stopAll([
    listen(window, 'dragenter', countFileDrags(count, enterOne)),
    listen(window, 'dragleave', countFileDrags(count, leaveOne)),
    listen(window, 'drop', () => count(leaveAll)),
    listenForEscape(() => count(leaveAll)),
  ]);
}

function enteredCount(onChange: (over: boolean) => void): ChangeCount {
  let entered = 0;

  return (change) => {
    entered = Math.max(0, change(entered));
    onChange(entered > 0);
  };
}

const stopAll =
  (stops: Stop[]): Stop =>
  (): void => {
    for (const stop of stops) stop();
  };

function watchDrops(
  target: HTMLElement,
  onDropFiles: (dropped: DroppedFiles) => void,
): Stop {
  return stopAll([
    listen(target, 'dragover', allowDrop),
    listen(target, 'drop', dropOn(onDropFiles)),
  ]);
}

type DropFiles = (dropped: DroppedFiles) => void;

function watchTarget(
  targetId: string,
  onDropFiles: DropFiles,
  onDragging: (dragging: boolean) => void,
): Stop | undefined {
  const target = document.getElementById(targetId);

  if (!target) return undefined;

  return stopAll([
    watchDrops(target, onDropFiles),
    watchFilesOverWindow(onDragging),
  ]);
}

// The latest handler, so a parent's new callback on each render never resubscribes, and resets, mid-drag.
function useLatestDrop(
  onDropFiles: DropFiles | undefined,
): DropFiles | undefined {
  const latest = useRef(onDropFiles);

  useEffect(() => {
    latest.current = onDropFiles;
  });

  const drop = useCallback<DropFiles>(
    (dropped) => latest.current?.(dropped),
    [],
  );

  return onDropFiles && drop;
}

/*
 * Files dragged from the desktop or another window attach to the draft when dropped on the target; anything else is left to the page.
 * Returns whether files are over the window, so the target can show where they land.
 */
export function useFileDrop({
  targetId,
  onDropFiles,
}: FileDropOptions): boolean {
  const [dragging, setDragging] = useState(false);
  const drop = useLatestDrop(onDropFiles);

  useEffect(() => {
    const stop = drop && watchTarget(targetId, drop, setDragging);

    return (): void => {
      if (stop) stop();
      setDragging(false);
    };
  }, [targetId, drop]);

  return dragging;
}
