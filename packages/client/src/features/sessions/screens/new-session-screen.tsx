import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { useAttachmentDraft } from '#features/composer';
import { useConnectionState } from '#features/connection';
import { useNavigate } from '#lib/product/navigation/context';
import {
  NewSessionView,
  type NewSessionViewProps,
} from '../components/new-session-view/new-session-view';
import { toNewSessionViewProps } from './new-session-view-props';
import { useNewSessionData } from './use-new-session-data';
import { type AttachmentDraft, useSessionOpening } from './use-session-opening';

export interface NewSessionScreenProps {
  // The Project whose heading + opened this page.
  projectId?: string;
}

export function NewSessionScreen({
  projectId,
}: NewSessionScreenProps): React.JSX.Element {
  return <NewSessionView {...useNewSessionViewProps(projectId)} />;
}

const useNewSessionDraft = (
  project: ProjectInfo | undefined,
): AttachmentDraft =>
  useAttachmentDraft(project && { type: 'new-session', projectId: project.id });

function useNewSessionViewProps(projectId?: string): NewSessionViewProps {
  const navigate = useNavigate();
  const connected = useConnectionState() === 'open';
  const data = useNewSessionData(projectId);
  const attachmentDraft = useNewSessionDraft(data.choices.project);
  const sessionOpening = useSessionOpening(attachmentDraft, data);
  return toNewSessionViewProps({
    data,
    connected,
    navigate,
    attachmentDraft,
    sessionOpening,
  });
}
