import type {
  ComposerAttachment,
  ComposerDraft,
} from '../components/composer/composer';
import type { KeptAttachmentsOfDraft } from '../stores/kept-attachments';
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
  // Whose draft this is, from the last change of owner; the draft is kept for it only while it matches.
  ownerKey?: DraftKey;
}

export type AttachmentDraftEvent =
  | { type: 'picked'; picked: readonly PickedAttachment[] }
  | { type: 'pickFailed'; key: string }
  | { type: 'folderDropped'; key: string }
  | { type: 'changed'; draft: ComposerDraft }
  | { type: 'ownerChanged'; key: DraftKey; kept: KeptAttachmentsOfDraft }
  | { type: 'restored'; key: DraftKey; text: string }
  | { type: 'cleared' };

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

// A new owner's draft starts with the Attachments kept for it; its kept text follows.
function ownerChanged(
  key: DraftKey,
  kept: KeptAttachmentsOfDraft,
): AttachmentDraftState {
  return {
    ...emptyAttachmentDraft,
    draft: { text: '', attachments: kept.attachments },
    files: kept.files,
    awaitedKey: key,
    ownerKey: key,
  };
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
        ? ownerChanged(event.key, event.kept)
        : state,
    restored: (state, event) =>
      event.type === 'restored' ? restore(state, event) : state,
    cleared: (state) => ({ ...emptyAttachmentDraft, ownerKey: state.ownerKey }),
  };

// A Composer draft with attachments: what each pick, drop, edit, send and change of owner does to it.
export function attachmentDraftReducer(
  state: AttachmentDraftState,
  event: AttachmentDraftEvent,
): AttachmentDraftState {
  return draftTransitions[event.type](state, event);
}
