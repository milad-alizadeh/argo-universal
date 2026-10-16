import type { AgentServer, ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import {
  Composer,
  type ComposerConfigurationProps,
  type ComposerProps,
  type ComposerDraft,
  StartSessionIn,
} from '#features/composer';
import {
  SessionCallout,
  type SessionCalloutProps,
  type StartingFeed,
  TerminalSignIn,
  type TerminalSignInProps,
  serverSilentMessage,
} from '#features/sessions';
import { useContentWide } from '#lib/product/content-layout';
import { PageHeader } from '#lib/product/page-header';
import { Screen } from '#lib/product/screen/screen';
import { SessionLayout } from '#lib/product/session-layout';
import { type ErrorToast, useErrorToast } from '#primitives/overlays/toast';
import { composerDraftProps } from './new-session-draft';
import { NewSessionFeed } from './new-session-feed';

export interface ReadySessionNewViewProps {
  serverName: string;
  // False while the Connection to the Server is down and the App retries.
  connected: boolean;
  projects: ProjectInfo[];
  projectId: string;
  onProjectChange: (projectId: string) => void;
  // The Installed Agents to choose from, in name order; the chosen one is the configuration's Agent.
  agents: AgentServer[];
  onAgentChange: (agent: string) => void;
  onAddAgents: () => void;
  // The chosen Agent, its model and effort, and the checkout.
  configuration: ComposerConfigurationProps;
  // The first prompt; sending it opens the Session.
  draft: ComposerDraft;
  onDraftChange: (draft: ComposerDraft) => void;
  onAttachImages: () => void;
  onAttachFiles: () => void;
  onDropFiles: NonNullable<ComposerProps['onDropFiles']>;
  onSend: (draft: ComposerDraft) => void;
  // False until every choice has settled and the Server is reachable; Send also waits for a prompt.
  canOpen: boolean;
  // True while the draft's attachments upload and the Session opens.
  opening: boolean;
  // The sent first prompt and Working, drawn in the Feed while the Session opens.
  starting?: StartingFeed;
  /*
   * Why the chosen Agent can't start a Session, and how to set it up.
   * An attachment that couldn't be selected or uploaded.
   */
  attachmentError?: string;
  attachmentErrorKey?: string;
  // Sign in or Retry after the Session failed to open; the Feed and Composer stay.
  callout?: SessionCalloutProps;
  // A terminal sign-in method's panel or sheet.
  signInTerminal?: TerminalSignInProps;
}

export type SessionNewViewProps =
  | { state: 'loading' }
  | { state: 'load-failed' }
  | ({ state: 'ready' } & ReadySessionNewViewProps);

const loadFailed: ErrorToast = {
  title: "Couldn't load New Session",
  message: serverSilentMessage,
};

// The header stays empty until the first prompt starts the Session and gives it a title.
const newSessionHeader = <PageHeader title={null} />;

// The Composer of a Session not yet opened: its first prompt opens it with the chosen Agent, model and effort.
export function SessionNewView(props: SessionNewViewProps): React.JSX.Element {
  // A failed load stays blank: the toast says why, and the page retries when the Connection reopens.
  useErrorToast(props.state === 'load-failed' ? loadFailed : undefined);

  if (props.state !== 'ready')
    return <Screen edges={['bottom']}>{newSessionHeader}</Screen>;

  return <ReadySessionNewView {...props} />;
}

function NewSessionStartIn(props: ReadySessionNewViewProps): React.JSX.Element {
  return (
    <View className="w-full items-center pb-2">
      <StartSessionIn {...startInProps(props)} />
    </View>
  );
}

function PromptComposer(props: ReadySessionNewViewProps): React.JSX.Element {
  return <Composer {...promptComposerProps(props)} />;
}

// A Send held by a failed open presents a phone's dismissed sheet again.
const calloutOf = ({
  callout,
  opening,
}: ReadySessionNewViewProps): React.ReactNode =>
  callout && <SessionCallout key={String(opening)} {...callout} />;

const promptComposerProps = (
  props: ReadySessionNewViewProps,
): ComposerProps => ({
  ...composerDraftProps(props),
  onAttachImages: props.onAttachImages,
  onAttachFiles: props.onAttachFiles,
  onDropFiles: props.onDropFiles,
  onSend: props.onSend,
  configuration: props.configuration,
  placeholder: 'What should the Agent work on?',
  sendable: props.canOpen,
  callout: calloutOf(props),
  error: props.attachmentError,
  errorKey: props.attachmentErrorKey,
});

function NewSessionComposer(
  props: ReadySessionNewViewProps,
): React.JSX.Element {
  const wide = useContentWide();

  return (
    <>
      {/* A Session has no such row, so it goes with the sent prompt and the Feed keeps its place at hand-off. */}
      {!wide && !props.starting && <NewSessionStartIn {...props} />}
      <PromptComposer {...props} />
    </>
  );
}

function ReadySessionNewView(
  props: ReadySessionNewViewProps,
): React.JSX.Element {
  return (
    <SessionLayout
      header={newSessionHeader}
      feed={<NewSessionContent {...props} />}
      composer={<NewSessionComposer {...props} />}
      panel={
        props.signInTerminal && <TerminalSignIn {...props.signInTerminal} />
      }
    />
  );
}

const startInProps = (
  props: ReadySessionNewViewProps,
): React.ComponentProps<typeof StartSessionIn> => ({
  agents: props.agents,
  agent: props.configuration.agent,
  onAgentChange: props.onAgentChange,
  onAddAgents: props.onAddAgents,
  serverName: props.serverName,
  serverConnected: props.connected,
  projects: props.projects,
  projectId: props.projectId,
  onProjectChange: props.onProjectChange,
  checkout: props.configuration.checkout,
  disabled: props.opening,
});

function NewSessionContent(props: ReadySessionNewViewProps): React.JSX.Element {
  return (
    <NewSessionFeed
      starting={props.starting}
      context={<NewSessionStartIn {...props} />}
    />
  );
}
