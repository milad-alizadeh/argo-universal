import { useAttachmentDraft } from '#features/composer';
import { useConnectionState } from '#features/connection';
import { useNavigate } from '#lib/product/navigation/navigation';
import type { NewSessionWiring } from './new-session-wiring';
import { useNewSessionData } from './use-new-session-data';
import { useSessionOpening } from './use-session-opening';

export function useOpeningWiring(
  projectId: string | undefined,
): NewSessionWiring {
  const navigate = useNavigate();
  const connected = useConnectionState() === 'open';
  const data = useNewSessionData(projectId);
  const project = data.choices.project;

  const attachmentDraft = useAttachmentDraft(
    project && { type: 'new-session', projectId: project.id },
  );

  const sessionOpening = useSessionOpening(attachmentDraft, data, connected);

  return { data, connected, navigate, attachmentDraft, sessionOpening };
}
