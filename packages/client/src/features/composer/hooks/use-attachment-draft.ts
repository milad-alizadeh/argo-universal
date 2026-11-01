import type { BlobRef, SessionNewInput } from '@repo/contracts';
import { useMutation } from '@tanstack/react-query';
import { type Dispatch, useReducer } from 'react';
import { useTRPC } from '#features/connection';
import type { DroppedFiles } from '#lib/product/file-drop/file-drop-pane';
import type { ComposerDraft } from '../components/composer/composer';
import { keptAttachments } from '../stores/kept-attachments';
import { keptDrafts } from '../stores/kept-draft';
import {
  type AttachmentDraftEvent,
  attachmentDraftReducer,
  emptyAttachmentDraft,
} from '../utils/attachment-draft';
import {
  type AttachmentError,
  toAttachmentError,
  toUploadForms,
} from '../utils/attachment-upload';
import { type DraftKey, type DraftOwner, draftKey } from '../utils/draft-key';
import { draftPrompt, uploadedAttachments } from '../utils/draft-prompt';
import { pickActions } from './use-attachment-picking';
import { useKeptAttachments } from './use-kept-attachments';
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
  useKeptAttachments(key, state);

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

// Forgets at once, since the page may unmount before a render could.
function forgetDraft(key: DraftKey): void {
  keptDrafts.keep(key, '');
  keptAttachments.keep(key, [], new Map());
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

      if (key) forgetDraft(key);
    },
  };
}

async function uploadDraftAsPrompt(
  sent: ComposerDraft,
  { state, upload }: Pick<DraftActions, 'state' | 'upload'>,
): Promise<SessionNewInput['prompt'] | undefined> {
  upload.reset();
  const uploads = toUploadForms(sent, state.files);

  const blobs = await storedBlobs(upload, uploads);

  return (
    blobs &&
    draftPrompt(sent.text, uploadedAttachments(uploads, blobs), sent.resources)
  );
}

// The Blob stored for each upload, or undefined when storing failed.
function storedBlobs(
  upload: Upload,
  uploads: ReturnType<typeof toUploadForms>,
): Promise<BlobRef[] | undefined> {
  if (uploads.length === 0) return Promise.resolve([]);

  return upload
    .mutateAsync(uploads.map(({ form }) => form))
    .catch((): undefined => undefined);
}
