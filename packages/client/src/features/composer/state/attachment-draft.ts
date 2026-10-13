import type {
  ComposerAttachment,
  ComposerDraft,
} from '../components/composer/composer';
import type { DraftKey } from './draft-key';

export interface PickedAttachment {
  attachment: ComposerAttachment;
  file: Blob;
}

export interface AttachmentDraftState {
  draft: ComposerDraft;
  // The file behind each attachment, by its id in the draft.
  files: ReadonlyMap<string, Blob>;
  selectionError?: string;
  // The owner whose kept text may still replace the empty draft; gone once the person edits it.
  awaitedKey?: DraftKey;
}

export type AttachmentDraftEvent =
  | { type: 'picked'; picked: readonly PickedAttachment[] }
  | { type: 'pickFailed' }
  | { type: 'folderDropped' }
  | { type: 'changed'; draft: ComposerDraft }
  | { type: 'ownerChanged'; key: DraftKey }
  | { type: 'restored'; key: DraftKey; text: string }
  | { type: 'cleared' };

export type AttachmentError =
  | { kind: 'selection' | 'upload'; message: string }
  | undefined;

export const attachmentSelectionFailureMessage =
  "Couldn't select files. Try again.";

export const folderRefusedMessage =
  "Folders can't be attached. Attach the files inside instead.";

export const emptyAttachmentDraft: AttachmentDraftState = {
  draft: { text: '', attachments: [] },
  files: new Map(),
};

// Keeps a file only while its attachment is in the draft.
function changeDraft(
  state: AttachmentDraftState,
  draft: ComposerDraft,
): AttachmentDraftState {
  const kept = new Set(draft.attachments.map((attachment) => attachment.id));
  const files = new Map([...state.files].filter(([id]) => kept.has(id)));
  return { ...state, draft, files, awaitedKey: undefined };
}

function restore(
  state: AttachmentDraftState,
  { key, text }: { key: DraftKey; text: string },
): AttachmentDraftState {
  if (key !== state.awaitedKey) return state;
  return { ...state, draft: { ...state.draft, text }, awaitedKey: undefined };
}

function attach(
  state: AttachmentDraftState,
  picked: readonly PickedAttachment[],
): AttachmentDraftState {
  const files = new Map(state.files);
  for (const { attachment, file } of picked) files.set(attachment.id, file);
  const attachments = [
    ...state.draft.attachments,
    ...picked.map(({ attachment }) => attachment),
  ];
  return {
    ...state,
    draft: { ...state.draft, attachments },
    files,
    selectionError: undefined,
  };
}

// A Composer draft with attachments: what each pick, drop, edit, send and change of owner does to it.
export function attachmentDraftReducer(
  state: AttachmentDraftState,
  event: AttachmentDraftEvent,
): AttachmentDraftState {
  switch (event.type) {
    case 'picked':
      return attach(state, event.picked);
    case 'pickFailed':
      return { ...state, selectionError: attachmentSelectionFailureMessage };
    case 'folderDropped':
      return { ...state, selectionError: folderRefusedMessage };
    case 'changed':
      return changeDraft(state, event.draft);
    case 'ownerChanged':
      return { ...emptyAttachmentDraft, awaitedKey: event.key };
    case 'restored':
      return restore(state, event);
    case 'cleared':
      return emptyAttachmentDraft;
  }
}

export interface UploadForm {
  name: string;
  form: FormData;
}

// One upload form per attachment of the sent draft, in draft order.
export function toUploadForms(
  sent: ComposerDraft,
  files: ReadonlyMap<string, Blob>,
): UploadForm[] {
  return sent.attachments.map(({ id, name }) => {
    const file = files.get(id);
    if (!file) throw new Error(`No file for the attached ${name}`);
    const form = new FormData();
    form.append('file', file, name);
    return { name, form };
  });
}

// A failed selection shows before a failed upload.
export function toAttachmentError(
  selection: string | undefined,
  upload: Error | null,
): AttachmentError {
  if (selection) return { kind: 'selection', message: selection };
  if (upload)
    return {
      kind: 'upload',
      message: `Couldn't upload the attachment. ${upload.message}`,
    };
  return undefined;
}
