import type { ComposerDraft } from '../components/composer/composer';

export type AttachmentError =
  | { kind: 'selection' | 'upload'; message: string; key?: string }
  | undefined;

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
