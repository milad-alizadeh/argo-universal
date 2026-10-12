import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import {
  Composer,
  type ComposerConfigurationProps,
  type ComposerDraft,
  StartSessionIn,
} from '#features/composer';
import { Text } from '#lib/generic/primitives/display/text/text';
import {
  type ErrorToast,
  useErrorToast,
} from '#lib/generic/primitives/overlays/toast/toast';
import { useContentWide } from '#lib/product/content-layout';
import { PageHeader } from '#lib/product/page-header';
import { Screen } from '#lib/product/screen/screen';
import { SessionColumn, SessionLayout } from '#lib/product/session-layout';
import {
  serverSilentMessage,
  sessionOpenFailedTitle,
} from '../failure-messages';

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
  onSend: (draft: ComposerDraft) => void;
  // False until every choice has settled and the Server is reachable; Send also waits for a prompt.
  canOpen: boolean;
  // True while the draft's images upload and the Session opens.
  opening: boolean;
  // Why the chosen Agent can't start a Session, and how to set it up.
  setupStep?: string;
  // An attached image that couldn't be selected or uploaded.
  attachmentError?: string;
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
const newSessionTitle = null;

// The Composer of a Session not yet opened: its first prompt opens it with the chosen Agent, model and effort.
export function NewSessionView(props: NewSessionViewProps): React.JSX.Element {
  // A failed load stays blank: the toast says why, and the page retries when the Connection reopens.
  useErrorToast(props.state === 'load-failed' ? loadFailed : undefined);
  if (props.state !== 'ready')
    return (
      <Screen edges={['bottom']}>
        <PageHeader title={newSessionTitle} />
      </Screen>
    );
  return <ReadyNewSessionView {...props} />;
}

// Wide, the question sits centred in the space a Session's Feed fills.
function NewSessionHeading(): React.JSX.Element | null {
  if (!useContentWide()) return null;
  return (
    <View className="flex-1 justify-center pb-10">
      <SessionColumn className="px-4">
        <Text role="title" semanticRole="heading" aria-level={1}>
          What should we work on?
        </Text>
      </SessionColumn>
    </View>
  );
}

function ReadyNewSessionView(
  props: ReadyNewSessionViewProps,
): React.JSX.Element {
  const { configuration, opening } = props;
  useErrorToast(
    props.openError === undefined ? undefined : openFailed(props.openError),
  );
  return (
    <SessionLayout
      header={<PageHeader title={newSessionTitle} />}
      feed={<NewSessionHeading />}
      composer={
        <>
          <View className="w-full items-center pb-2">
            <StartSessionIn
              serverName={props.serverName}
              serverConnected={props.connected}
              projects={props.projects}
              projectId={props.projectId}
              onProjectChange={props.onProjectChange}
              checkout={configuration.checkout}
              disabled={opening}
            />
          </View>
          {props.setupStep !== undefined && (
            <Text
              semanticRole="alert"
              className="w-full px-4 pb-2 text-destructive"
            >
              {props.setupStep}
            </Text>
          )}
          <Composer
            draft={props.draft}
            onDraftChange={props.onDraftChange}
            onAttachImages={props.onAttachImages}
            onSend={props.onSend}
            configuration={configuration}
            placeholder="What should the Agent work on?"
            sending={opening}
            sendable={props.canOpen}
            error={props.attachmentError}
          />
        </>
      }
    />
  );
}
