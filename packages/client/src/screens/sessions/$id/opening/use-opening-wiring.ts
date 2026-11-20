import { useAttachmentDraft } from '#features/composer';
import { useConnectionState } from '#features/connection';
import { useNewSessionConversation } from '#features/conversation';
import { useNavigate } from '#lib/product/navigation/navigation';
import type { NewSessionWiring } from './new-session-wiring';
import { type NewSessionData, useNewSessionData } from './use-new-session-data';
import { type AttachmentDraft, useSessionOpening } from './use-session-opening';

export function useOpeningWiring(
  projectId: string | undefined,
  draft: string | undefined,
): Omit<NewSessionWiring, 'callout'> {
  const navigate = useNavigate();
  const connected = useConnectionState() === 'open';
  const data = useNewSessionData(projectId);
  const attachmentDraft = useNewSessionDraft(data, draft);
  const sessionOpening = useSessionOpening(attachmentDraft, data, connected);
  const base = { data, connected, navigate, attachmentDraft, sessionOpening };

  return { ...base, conversation: useOpeningConversation(sessionOpening) };
}

function useOpeningConversation(
  opening: ReturnType<typeof useSessionOpening>,
): ReturnType<typeof useNewSessionConversation> {
  const { store } = opening.session;

  return useNewSessionConversation((start) => store.call(start));
}

function useNewSessionDraft(
  data: NewSessionData,
  draft: string | undefined,
): AttachmentDraft {
  const project = data.choices.project;

  return useAttachmentDraft(
    project && { type: 'new-session', projectId: project.id },
    draft,
  );
}
