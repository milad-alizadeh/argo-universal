import type {
  ComposerDraft,
  ComposerImage,
} from '../components/composer/composer';
import type { DraftKey } from './draft-key';

export interface ImageDraftState {
  draft: ComposerDraft;
  // The file behind each attached image, by its id in the draft.
  files: ReadonlyMap<string, Blob>;
  selectionError?: string;
  // The owner whose kept text may still replace the empty draft; gone once the person edits it.
  awaitedKey?: DraftKey;
}

export type ImageDraftEvent =
  | { type: 'picked'; picked: readonly { image: ComposerImage; file: Blob }[] }
  | { type: 'pickFailed' }
  | { type: 'changed'; draft: ComposerDraft }
  | { type: 'ownerChanged'; key: DraftKey }
  | { type: 'restored'; key: DraftKey; text: string }
  | { type: 'cleared' };

export type AttachmentError =
  | { kind: 'selection' | 'upload'; message: string }
  | undefined;

export const imageSelectionFailureMessage =
  "Couldn't select images. Try again.";

export const emptyImageDraft: ImageDraftState = {
  draft: { text: '', images: [] },
  files: new Map(),
};

// Keeps a file only while its image is in the draft.
function changeDraft(
  state: ImageDraftState,
  draft: ComposerDraft,
): ImageDraftState {
  const kept = new Set(draft.images.map((image) => image.id));
  const files = new Map([...state.files].filter(([id]) => kept.has(id)));
  return { ...state, draft, files, awaitedKey: undefined };
}

function restore(
  state: ImageDraftState,
  { key, text }: { key: DraftKey; text: string },
): ImageDraftState {
  if (key !== state.awaitedKey) return state;
  return { ...state, draft: { ...state.draft, text }, awaitedKey: undefined };
}

function attach(
  state: ImageDraftState,
  picked: Extract<ImageDraftEvent, { type: 'picked' }>['picked'],
): ImageDraftState {
  const files = new Map(state.files);
  for (const { image, file } of picked) files.set(image.id, file);
  const images = [...state.draft.images, ...picked.map(({ image }) => image)];
  return {
    ...state,
    draft: { ...state.draft, images },
    files,
    selectionError: undefined,
  };
}

// A Composer draft with attached images: what each pick, edit, send and change of owner does to it.
export function imageDraftReducer(
  state: ImageDraftState,
  event: ImageDraftEvent,
): ImageDraftState {
  switch (event.type) {
    case 'picked':
      return attach(state, event.picked);
    case 'pickFailed':
      return { ...state, selectionError: imageSelectionFailureMessage };
    case 'changed':
      return changeDraft(state, event.draft);
    case 'ownerChanged':
      return { ...emptyImageDraft, awaitedKey: event.key };
    case 'restored':
      return restore(state, event);
    case 'cleared':
      return emptyImageDraft;
  }
}

// One upload form per image of the sent draft, in draft order.
export function toUploadForms(
  sent: ComposerDraft,
  files: ReadonlyMap<string, Blob>,
): FormData[] {
  return sent.images.map((image) => {
    const file = files.get(image.id);
    if (!file) throw new Error(`No file for the attached ${image.name}`);
    const form = new FormData();
    form.append('file', file, image.name);
    return form;
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
      message: `Couldn't upload the image. ${upload.message}`,
    };
  return undefined;
}
