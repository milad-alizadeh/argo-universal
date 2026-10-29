import type { BlobRef, SessionNewInput } from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
import { type Dispatch, useReducer } from 'react';
import { useTRPC } from '#features/connection';
import type { DroppedFiles } from '#lib/product/file-drop/file-drop-pane';
import type { ComposerDraft } from '../components/composer/composer';
import { keptDrafts } from '../stores/kept-draft';
import {
  type AttachmentDraftEvent,
  type AttachmentError,
  attachmentDraftReducer,
  emptyAttachmentDraft,
  type PickedAttachment,
  toAttachmentError,
  toUploadForms,
} from '../utils/attachment-draft';
import { type DraftKey, type DraftOwner, draftKey } from '../utils/draft-key';
import { draftPrompt } from '../utils/draft-prompt';
import { droppedFiles, pickFiles, pickImages } from './pick-attachments';
import { useKeptDraft } from './use-kept-draft';

export interface AttachmentDraft {
  draft: ComposerDraft;
  changeDraft: (next: ComposerDraft) => void;
  attachImages: () => Promise<void>;
  attachFiles: () => Promise<void>;
  attachDroppedFiles: (dropped: DroppedFiles) => Promise<void>;
  uploadDraftAsPrompt: (
    sent: ComposerDraft,
  ) => Promise<SessionNewInput['prompt'] | undefined>;
  clearDraft: () => void;
  uploading: boolean;
  attachmentError: AttachmentError;
}

function useAttachmentUpload(): ReturnType<
  typeof useMutation<BlobRef[], Error, FormData[]>
> {
  const upload = useTRPC().blob.upload.mutationOptions().mutationFn;

  return useMutation({
    mutationFn: (forms: FormData[], context) => {
      if (!upload) throw new Error('Blob upload mutation function is missing');

      return Promise.all(forms.map((form) => upload(form, context)));
    },
  });
}

type DraftState = typeof emptyAttachmentDraft;

type Upload = ReturnType<typeof useAttachmentUpload>;

interface DraftActions {
  state: DraftState;
  dispatch: Dispatch<AttachmentDraftEvent>;
  upload: Upload;
  key: DraftKey | undefined;
}

let selectionFailures = 0;

function selectionFailureKey(): string {
  selectionFailures += 1;

  return `attachment-selection:${selectionFailures}`;
}

// `seed` stands in for the text kept for the owner, and is kept only once the person edits it.
export function useAttachmentDraft(
  owner: DraftOwner | undefined,
  seed?: string,
): AttachmentDraft {
  const [state, dispatch] = useReducer(
    attachmentDraftReducer,
    emptyAttachmentDraft,
  );

  const upload = useAttachmentUpload();
  const key = owner && draftKey(owner);
  useKeptDraft(key, dispatch, seed);

  return attachmentDraftActions({ state, dispatch, upload, key });
}

function attachmentDraftActions(actions: DraftActions): AttachmentDraft {
  return {
    ...editActions(actions),
    ...pickActions(actions.dispatch),
    draft: actions.state.draft,
    uploadDraftAsPrompt: (sent) => uploadDraftAsPrompt(sent, actions),
    uploading: actions.upload.isPending,
    attachmentError: toAttachmentError(
      actions.state.selectionError,
      actions.upload.error,
      actions.state.selectionErrorKey,
    ),
  };
}

type EditableDraft = Pick<DraftActions, 'dispatch' | 'key'>;

type DraftChanges = Pick<AttachmentDraft, 'changeDraft' | 'clearDraft'>;

function editActions({ dispatch, key }: EditableDraft): DraftChanges {
  return {
    changeDraft: (draft) => {
      dispatch({ type: 'changed', draft });

      if (key) keptDrafts.keep(key, draft.text);
    },
    clearDraft: () => {
      dispatch({ type: 'cleared' });

      if (key) keptDrafts.keep(key, '');
    },
  };
}

function pickActions(
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

async function uploadDraftAsPrompt(
  sent: ComposerDraft,
  { state, upload }: Pick<DraftActions, 'state' | 'upload'>,
): Promise<SessionNewInput['prompt'] | undefined> {
  upload.reset();
  const uploads = toUploadForms(sent, state.files);

  const blobs = uploads.length
    ? await upload
        .mutateAsync(uploads.map(({ form }) => form))
        .catch((): undefined => undefined)
    : [];

  return (
    blobs &&
    draftPrompt(sent.text, uploadedAttachments(uploads, blobs), sent.resources)
  );
}

function uploadedAttachments(
  uploads: ReturnType<typeof toUploadForms>,
  blobs: BlobRef[],
): { name: string; blob: BlobRef }[] {
  return uploads.flatMap(({ name }, index) => {
    const blob = blobs[index];

    return blob ? [{ name, blob }] : [];
  });
}
