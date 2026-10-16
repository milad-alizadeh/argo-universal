import { useAttachmentDraft } from '#features/composer';
import { useConnectionState } from '#features/connection';
import { useNavigate } from '#lib/product/navigation/navigation';
import type { NewSessionWiring } from './new-session-wiring';
import { useNewSessionCallout } from './use-new-session-callout';
import { type NewSessionData, useNewSessionData } from './use-new-session-data';
import { type AttachmentDraft, useSessionOpening } from './use-session-opening';

export function useOpeningWiring(
  projectId: string | undefined,
): NewSessionWiring {
  const opening = useOpeningState(projectId);

  return { ...opening, callout: useNewSessionCallout(opening) };
}

function useOpeningState(
  projectId: string | undefined,
): Omit<NewSessionWiring, 'callout'> {
  const navigate = useNavigate();
  const connected = useConnectionState() === 'open';
  const data = useNewSessionData(projectId);
  const attachmentDraft = useNewSessionDraft(data);
  const sessionOpening = useSessionOpening(attachmentDraft, data, connected);

  return { data, connected, navigate, attachmentDraft, sessionOpening };
}

function useNewSessionDraft(data: NewSessionData): AttachmentDraft {
  const project = data.choices.project;

  return useAttachmentDraft(
    project && { type: 'new-session', projectId: project.id },
  );
}
