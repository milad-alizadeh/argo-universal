import { canOpenSession } from '../state/open-session';
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

const isOpening = ({
  attachmentDraft,
  sessionOpening,
}: NewSessionWiring): boolean =>
  attachmentDraft.uploading || sessionOpening.newSession.isPending;

const canOpen = (
  { connected, data }: NewSessionWiring,
  opening: boolean,
): boolean =>
  canOpenSession({
    connected,
    choices: data.choices,
    configReady: data.configuration.ready,
    opening,
  });

export const openingProps = (
  wiring: NewSessionWiring,
): ReadyProps<'canOpen' | 'opening' | 'starting'> => {
  const opening = isOpening(wiring);
  return {
    canOpen: canOpen(wiring, opening),
    opening,
    starting: wiring.sessionOpening.starting,
  };
};
