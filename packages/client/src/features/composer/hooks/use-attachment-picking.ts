import type { Dispatch } from 'react';
import type { DroppedFiles } from '#lib/product/file-drop/file-drop-pane';
import type {
  AttachmentDraftEvent,
  PickedAttachment,
} from '../utils/attachment-draft';
import { droppedFiles, pickFiles, pickImages } from './pick-attachments';
import type { AttachmentDraft } from './use-attachment-draft';

let selectionFailures = 0;

function selectionFailureKey(): string {
  selectionFailures += 1;

  return `attachment-selection:${selectionFailures}`;
}

export function pickActions(
  dispatch: Dispatch<AttachmentDraftEvent>,
): Pick<
  AttachmentDraft,
  'attachImages' | 'attachFiles' | 'attachDroppedFiles'
> {
  return {
    attachImages: () => attach(pickImages, dispatch),
    attachFiles: () => attach(pickFiles, dispatch),
    attachDroppedFiles: (dropped) => attachDropped(dropped, dispatch),
  };
}

async function attach(
  pick: () => Promise<PickedAttachment[]>,
  dispatch: Dispatch<AttachmentDraftEvent>,
): Promise<void> {
  try {
    dispatch({ type: 'picked', picked: await pick() });
  } catch {
    dispatch({ type: 'pickFailed', key: selectionFailureKey() });
  }
}

async function attachDropped(
  { files, folders }: DroppedFiles,
  dispatch: Dispatch<AttachmentDraftEvent>,
): Promise<void> {
  if (files.length > 0) await attach(() => droppedFiles(files), dispatch);

  if (folders > 0)
    dispatch({ type: 'folderDropped', key: selectionFailureKey() });
}
