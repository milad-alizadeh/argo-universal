import {
  composerImage,
  composerOtherFile,
  composerTextFile,
  oversizedComposerImage,
} from '../../../../../mocks/composer-mock';
import type { ComposerAttachmentCardProps } from './composer-attachment-card';

// A story supplies Remove; a fixture is the attachment and whether the Composer is inactive.
type AttachmentFixture = Omit<ComposerAttachmentCardProps, 'onRemove'>;

// An attached image fills the tile with its own preview.
export const imageAttachment = {
  attachment: composerImage,
  disabled: false,
} satisfies AttachmentFixture;

// A text file shows its first lines above its name.
export const textFileAttachment = {
  attachment: composerTextFile,
  disabled: false,
} satisfies AttachmentFixture;

// Any other file shows its kind instead of a preview.
export const otherFileAttachment = {
  attachment: composerOtherFile,
  disabled: false,
} satisfies AttachmentFixture;

// Past the upload limit: the tile takes the danger border.
export const oversizedAttachment = {
  attachment: oversizedComposerImage,
  disabled: false,
} satisfies AttachmentFixture;
