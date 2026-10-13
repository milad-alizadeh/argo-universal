import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { useAttachmentDraft } from '#features/composer';
import { useConnectionState } from '#features/connection';
import { useNavigate } from '#lib/product/navigation/context';
import {
  NewSessionView,
  type NewSessionViewProps,
} from '../components/new-session-view/new-session-view';
import {
  type OpenedSession,
  OpenedSessionReader,
  useOpenedOptions,
  withOpenedOptions,
} from './empty-session-options';
import { toNewSessionViewProps } from './new-session-view-props';
import type { NewSessionWiring } from './new-session-wiring';
import { useNewSessionData } from './use-new-session-data';
import {
  type AttachmentDraft,
  type SessionOpening,
  useSessionOpening,
} from './use-session-opening';

export interface NewSessionScreenProps {
  // The Project whose heading + opened this page.
  projectId?: string;
}

export function NewSessionScreen({
  projectId,
}: NewSessionScreenProps): React.JSX.Element {
  const { view, opened } = useNewSessionViewProps(projectId);
  const options = useOpenedOptions(opened);

  return (
    <>
      <OpenedSessionReader opened={opened} onRead={options.onRead} />
      <NewSessionView {...withOpenedOptions(view, options)} />
    </>
  );
}

const useNewSessionDraft = (
  project: ProjectInfo | undefined,
): AttachmentDraft =>
  useAttachmentDraft(project && { type: 'new-session', projectId: project.id });

// The empty Session whose options the page reads, until it hands it on.
const openedSession = (
  { session }: SessionOpening,
  agent: string | undefined,
): OpenedSession | undefined =>
  session.openSessionId && agent
    ? { sessionId: session.openSessionId, agent, actor: session.actor }
    : undefined;

function useNewSessionWiring(projectId?: string): NewSessionWiring {
  const navigate = useNavigate();
  const connected = useConnectionState() === 'open';
  const data = useNewSessionData(projectId);
  const attachmentDraft = useNewSessionDraft(data.choices.project);
  const sessionOpening = useSessionOpening(attachmentDraft, data, connected);

  return { data, connected, navigate, attachmentDraft, sessionOpening };
}

interface NewSessionScreenState {
  view: NewSessionViewProps;
  opened?: OpenedSession;
}

function useNewSessionViewProps(projectId?: string): NewSessionScreenState {
  const wiring = useNewSessionWiring(projectId);
  const view = toNewSessionViewProps(wiring);

  if (view.state !== 'ready') return { view };
  const agent = wiring.data.choices.agent?.agent;

  return { view, opened: openedSession(wiring.sessionOpening, agent) };
}
