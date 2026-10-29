import type { AgentServer, ProjectInfo, SlashCommand } from '@repo/contracts';
import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import type * as React from 'react';
import { View } from 'react-native';
import {
  Composer,
  type ComposerConfigurationProps,
  type ComposerDraft,
  ComposerStack,
  StartSessionIn,
} from '#features/composer';
import {
  type SessionCalloutProps,
  type StartingFeed,
  TerminalSignIn,
  type TerminalSignInProps,
  serverSilentMessage,
} from '#features/sessions';
import { useContentWide } from '#lib/product/content-layout';
import type { DroppedFiles } from '#lib/product/file-drop/file-drop-pane';
import { Screen } from '#lib/product/screen/screen';
import { SessionLayout } from '#lib/product/session-layout';
import { promptComposerProps } from './new-session-composer-props';
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
  // The chosen Agent's Slash commands for the chosen Project; undefined until the Server has seen a list.
  slashCommands?: SlashCommand[];
  // The first prompt; sending it opens the Session.
  draft: ComposerDraft;
  onDraftChange: (draft: ComposerDraft) => void;
  onAttachImages: () => void;
  onAttachFiles: () => void;
  onDropFiles: (dropped: DroppedFiles) => void;
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
  calloutInConfiguration?: boolean;
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

// The Composer of a Session not yet opened: its first prompt opens it with the chosen Agent, model and effort.
export function SessionNewView(props: SessionNewViewProps): React.JSX.Element {
  // A failed load stays blank: the toast says why, and the page retries when the Connection reopens.
  useErrorToast(props.state === 'load-failed' ? loadFailed : undefined);

  if (props.state !== 'ready')
    return <Screen edges={['bottom']}>{null}</Screen>;

  return <ReadySessionNewView {...props} />;
}

function NewSessionStartIn(props: ReadySessionNewViewProps): React.JSX.Element {
  return (
    <View className="w-full items-center">
      <StartSessionIn {...startInProps(props)} />
    </View>
  );
}

function PromptComposer(props: ReadySessionNewViewProps): React.JSX.Element {
  return <Composer {...promptComposerProps(props)} />;
}

function NewSessionComposer(
  props: ReadySessionNewViewProps,
): React.JSX.Element {
  const wide = useContentWide();

  return (
    <View className="w-full self-center">
      <ComposerStack
        // A Session has no such row, so it goes with the sent prompt and the Feed keeps its place at hand-off.
        above={!wide && !props.starting && <NewSessionStartIn {...props} />}
      >
        <PromptComposer {...props} />
      </ComposerStack>
    </View>
  );
}

function ReadySessionNewView(
  props: ReadySessionNewViewProps,
): React.JSX.Element {
  return (
    <SessionLayout
      header={null}
      feed={<NewSessionContent {...props} />}
      composer={<NewSessionComposer {...props} />}
      onDropFiles={props.onDropFiles}
      panel={
        props.signInTerminal && <TerminalSignIn {...props.signInTerminal} />
      }
    />
  );
}

const startInProps = (
  props: ReadySessionNewViewProps,
): React.ComponentProps<typeof StartSessionIn> => ({
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
