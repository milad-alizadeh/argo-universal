import type { ComposerDraft, ComposerProps } from '#features/composer';
import { type StartingFeed } from '#features/new-session';

type ComposerDraftProps = Pick<
  ComposerProps,
  'draft' | 'onDraftChange' | 'sending' | 'disabled'
>;

interface NewSessionDraft {
  draft: ComposerDraft;
  onDraftChange: (draft: ComposerDraft) => void;
  opening: boolean;
  starting?: StartingFeed;
}

const emptyDraft: ComposerDraft = { text: '', attachments: [] };

const ignoreDraft = (): void => {};

// Once the prompt shows in the Feed the Composer stands empty and still; the draft returns if the start fails.
export const composerDraftProps = (
  props: NewSessionDraft,
): ComposerDraftProps =>
  props.starting
    ? { draft: emptyDraft, onDraftChange: ignoreDraft, disabled: true }
    : {
        draft: props.draft,
        onDraftChange: props.onDraftChange,
        sending: props.opening,
      };
