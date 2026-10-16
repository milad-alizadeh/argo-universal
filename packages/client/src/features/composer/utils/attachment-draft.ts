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
  selectionErrorKey?: string;
  // The owner whose kept text may still replace the empty draft; gone once the person edits it.
  awaitedKey?: DraftKey;
}

export type AttachmentDraftEvent =
  | { type: 'picked'; picked: readonly PickedAttachment[] }
  | { type: 'pickFailed'; key: string }
  | { type: 'folderDropped'; key: string }
  | { type: 'changed'; draft: ComposerDraft }
  | { type: 'ownerChanged'; key: DraftKey }
  | { type: 'restored'; key: DraftKey; text: string }
  | { type: 'cleared' };

export type AttachmentError =
  | { kind: 'selection' | 'upload'; message: string; key?: string }
  | undefined;

export const attachmentSelectionFailureMessage =
  "Couldn't select files. Try again.";

export const folderRefusedMessage =
  "Folders can't be attached. Attach the files inside instead.";

const clearedSelectionError = {
  selectionError: undefined,
  selectionErrorKey: undefined,
};

export const emptyAttachmentDraft: AttachmentDraftState = {
  ...clearedSelectionError,
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
  const attachments = [
    ...state.draft.attachments,
    ...picked.map(({ attachment }) => attachment),
  ];

  return {
    ...state,
    draft: { ...state.draft, attachments },
    files: attachedFiles(state.files, picked),
    ...clearedSelectionError,
  };
}

function attachedFiles(
  files: AttachmentDraftState['files'],
  picked: readonly PickedAttachment[],
): Map<string, Blob> {
  return new Map([
    ...files,
    ...picked.map(({ attachment, file }): [string, Blob] => [
      attachment.id,
      file,
    ]),
  ]);
}

type DraftTransition = (
  state: AttachmentDraftState,
  event: AttachmentDraftEvent,
) => AttachmentDraftState;

const draftTransitions: Record<AttachmentDraftEvent['type'], DraftTransition> =
  {
    picked: (state, event) =>
      event.type === 'picked' ? attach(state, event.picked) : state,
    pickFailed: (state, event) => ({
      ...state,
      selectionError: attachmentSelectionFailureMessage,
      selectionErrorKey: 'key' in event ? event.key : undefined,
    }),
    folderDropped: (state, event) => ({
      ...state,
      selectionError: folderRefusedMessage,
      selectionErrorKey: 'key' in event ? event.key : undefined,
    }),
    changed: (state, event) =>
      event.type === 'changed' ? changeDraft(state, event.draft) : state,
    ownerChanged: (state, event) =>
      event.type === 'ownerChanged'
        ? { ...emptyAttachmentDraft, awaitedKey: event.key }
        : state,
    restored: (state, event) =>
      event.type === 'restored' ? restore(state, event) : state,
    cleared: () => emptyAttachmentDraft,
  };

// A Composer draft with attachments: what each pick, drop, edit, send and change of owner does to it.
export function attachmentDraftReducer(
  state: AttachmentDraftState,
  event: AttachmentDraftEvent,
): AttachmentDraftState {
  return draftTransitions[event.type](state, event);
}

export interface UploadForm {
  name: string;
  form: FormData;
}

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
  key?: string,
): AttachmentError {
  if (selection) return { kind: 'selection', message: selection, key };

  if (upload)
    return {
      kind: 'upload',
      message: `Couldn't upload the attachment. ${upload.message}`,
    };

  return undefined;
}
