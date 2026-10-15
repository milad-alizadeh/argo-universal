import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import {
  Composer,
  type ComposerConfigurationProps,
  type ComposerProps,
  type ComposerDraft,
  StartSessionIn,
} from '#features/composer';
import { PhoneTitle } from '#lib/product/navigation/phone-title';
import { PageHeader } from '#lib/product/page-header';
import { Screen } from '#lib/product/screen/screen';
import { SessionLayout } from '#lib/product/session-layout';
import { Text } from '#primitives/display/text';
import { type ErrorToast, useErrorToast } from '#primitives/overlays/toast';
import type { StartingFeed } from '../../state/starting-feed';
import {
  serverSilentMessage,
  sessionOpenFailedTitle,
} from '../failure-messages';
import { composerDraftProps } from './new-session-draft';
import { NewSessionFeed } from './new-session-feed';

export interface ReadyNewSessionViewProps {
  serverName: string;
  // False while the Connection to the Server is down and the App retries.
  connected: boolean;
  projects: ProjectInfo[];
  projectId: string;
  onProjectChange: (projectId: string) => void;
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
  // Why the chosen Agent can't start a Session, and how to set it up.
  setupStep?: string;
  // An attachment that couldn't be selected or uploaded.
  attachmentError?: string;
  attachmentErrorKey?: string;
  openError?: string;
}

export type NewSessionViewProps =
  | { state: 'loading' }
  | { state: 'load-failed' }
  | ({ state: 'ready' } & ReadyNewSessionViewProps);

const loadFailed: ErrorToast = {
  title: "Couldn't load New Session",
  message: serverSilentMessage,
};

const openFailed = (message: string): ErrorToast => ({
  title: sessionOpenFailedTitle,
  message,
});

// The header stays empty until the first prompt starts the Session and gives it a title.
const newSessionHeader = (
  <>
    <PhoneTitle title="" />
    <PageHeader title={null} />
  </>
);

// The Composer of a Session not yet opened: its first prompt opens it with the chosen Agent, model and effort.
export function NewSessionView(props: NewSessionViewProps): React.JSX.Element {
  // A failed load stays blank: the toast says why, and the page retries when the Connection reopens.
  useErrorToast(props.state === 'load-failed' ? loadFailed : undefined);

  if (props.state !== 'ready')
    return <Screen edges={['bottom']}>{newSessionHeader}</Screen>;

  return <ReadyNewSessionView {...props} />;
}

function openFailure(props: ReadyNewSessionViewProps): ErrorToast | undefined {
  return props.openError === undefined
    ? undefined
    : openFailed(props.openError);
}

function NewSessionStartIn(props: ReadyNewSessionViewProps): React.JSX.Element {
  return (
    <View className="w-full items-center pb-2">
      <StartSessionIn
        serverName={props.serverName}
        serverConnected={props.connected}
        projects={props.projects}
        projectId={props.projectId}
        onProjectChange={props.onProjectChange}
        checkout={props.configuration.checkout}
        disabled={props.opening}
      />
    </View>
  );
}

function SetupStepAlert({
  setupStep,
}: {
  setupStep?: string;
}): React.ReactNode {
  if (setupStep === undefined) return null;

  return (
    <Text accessibilityRole="alert" className="w-full px-4 pb-2 text-danger">
      {setupStep}
    </Text>
  );
}

function PromptComposer(props: ReadyNewSessionViewProps): React.JSX.Element {
  return <Composer {...promptComposerProps(props)} />;
}

const promptComposerProps = (
  props: ReadyNewSessionViewProps,
): ComposerProps => ({
  ...composerDraftProps(props),
  onAttachImages: props.onAttachImages,
  onAttachFiles: props.onAttachFiles,
  onDropFiles: props.onDropFiles,
  onSend: props.onSend,
  configuration: props.configuration,
  placeholder: 'What should the Agent work on?',
  sendable: props.canOpen,
  error: props.attachmentError,
  errorKey: props.attachmentErrorKey,
});

function NewSessionComposer(
  props: ReadyNewSessionViewProps,
): React.JSX.Element {
  return (
    <>
      {/* A Session has no such row, so it goes with the sent prompt and the Feed keeps its place at hand-off. */}
      {!props.starting && <NewSessionStartIn {...props} />}
      <SetupStepAlert setupStep={props.setupStep} />
      <PromptComposer {...props} />
    </>
  );
}

function ReadyNewSessionView(
  props: ReadyNewSessionViewProps,
): React.JSX.Element {
  useErrorToast(openFailure(props));

  return (
    <SessionLayout
      header={newSessionHeader}
      feed={<NewSessionFeed starting={props.starting} />}
      composer={<NewSessionComposer {...props} />}
    />
  );
}
