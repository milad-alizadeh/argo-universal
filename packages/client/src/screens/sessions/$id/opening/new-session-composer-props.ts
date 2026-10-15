import { canOpenSession } from '#features/sessions';
import type { NewSessionWiring, ReadyProps } from './new-session-wiring';

type DraftProps = ReadyProps<
  | 'draft'
  | 'onDraftChange'
  | 'onAttachImages'
  | 'onAttachFiles'
  | 'onDropFiles'
  | 'onSend'
>;

export const draftProps = ({
  attachmentDraft,
  sessionOpening,
}: NewSessionWiring): DraftProps => ({
  draft: attachmentDraft.draft,
  onDraftChange: attachmentDraft.changeDraft,
  onAttachImages: () => void attachmentDraft.attachImages(),
  onAttachFiles: () => void attachmentDraft.attachFiles(),
  onDropFiles: (dropped) => void attachmentDraft.attachDroppedFiles(dropped),
  onSend: (sent) => void sessionOpening.sendFirstPrompt(sent),
});

const canOpen = ({
  connected,
  data,
  sessionOpening,
}: NewSessionWiring): boolean =>
  canOpenSession({
    connected,
    choices: data.choices,
    sending: sessionOpening.sending,
    handedOff: sessionOpening.session.handedOff,
  });

export const openingProps = (
  wiring: NewSessionWiring,
): ReadyProps<'canOpen' | 'opening' | 'starting'> => ({
  canOpen: canOpen(wiring),
  opening: wiring.sessionOpening.sending,
  starting: wiring.sessionOpening.starting,
});
