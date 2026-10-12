import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import {
  ComposerAgentModelControl,
  ComposerCheckoutControl,
  type ComposerConfigurationProps,
  StartSessionIn,
} from '#features/composer';
import { Text } from '#lib/generic/primitives/text';
import { useContentWide } from '#lib/product/content-layout';
import { PageHeader } from '#lib/product/page-header';
import { keyboardAvoidingStyle, Screen } from '#lib/product/screen';
import { type ErrorToast, useErrorToast } from '#primitives/toast';
import { Button } from '../../../lib/generic/primitives/button';

export interface ReadyNewSessionViewProps {
  serverName: string;
  // False while the Connection to the Server is down and the App retries.
  connected: boolean;
  projects: ProjectInfo[];
  projectId: string;
  onProjectChange: (projectId: string) => void;
  // The chosen Agent, its model and effort, and the checkout.
  configuration: ComposerConfigurationProps;
  // False until the Agent's remembered model and effort have loaded.
  configReady: boolean;
  canOpen: boolean;
  opening: boolean;
  onOpen: () => void;
  // Why the chosen Agent can't start a Session, and how to set it up.
  setupStep?: string;
  openError?: string;
}

export type NewSessionViewProps =
  | { state: 'loading' }
  | { state: 'load-failed' }
  | ({ state: 'ready' } & ReadyNewSessionViewProps);

const loadFailed: ErrorToast = {
  title: "Couldn't load New Session",
  message: "The Server didn't respond. Check that it's running.",
};

const openFailed = (message: string): ErrorToast => ({
  title: "Couldn't open the Session",
  message,
});

// Opens the chosen Session with its model and effort before the first prompt.
export function NewSessionView(props: NewSessionViewProps): React.JSX.Element {
  // A failed load stays blank: the toast says why, and the page retries when the Connection reopens.
  useErrorToast(props.state === 'load-failed' ? loadFailed : undefined);
  if (props.state !== 'ready')
    return (
      <Screen edges={['bottom']}>
        <PageHeader title="New Session" />
      </Screen>
    );
  return <ReadyNewSessionView {...props} />;
}

function NewSessionHeading(): React.JSX.Element {
  return (
    <View className="w-full max-w-composer gap-2 px-4">
      <Text role="title" semanticRole="heading" aria-level={1}>
        What should we work on?
      </Text>
    </View>
  );
}

function ReadyNewSessionView(
  props: ReadyNewSessionViewProps,
): React.JSX.Element {
  const wide = useContentWide();
  const { configuration, opening } = props;
  useErrorToast(
    props.openError === undefined ? undefined : openFailed(props.openError),
  );
  return (
    <Screen edges={['bottom']}>
      <PageHeader title="New Session" />
      <KeyboardAvoidingView
        behavior="padding"
        automaticOffset
        style={keyboardAvoidingStyle}
      >
        <View className="flex-1 items-center justify-center px-6 pb-10">
          {wide && <NewSessionHeading />}
        </View>
        <View
          className={wide ? 'items-center px-6 pb-2' : 'items-center px-4 pb-2'}
        >
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
        <View
          className={wide ? 'items-center px-6 pb-4' : 'items-center px-4 pb-4'}
        >
          <View className="w-full max-w-composer gap-3">
            <View className="flex-row items-center justify-between gap-3">
              <ComposerAgentModelControl
                disabled={opening || !props.configReady}
                configuration={configuration}
              />
              {wide && (
                <ComposerCheckoutControl
                  checkout={configuration.checkout}
                  disabled={opening}
                />
              )}
              <Button
                label="Open Session"
                accessibilityLabel="Open Session"
                disabled={!props.canOpen}
                loading={opening}
                onPress={props.onOpen}
              />
            </View>
            {props.setupStep !== undefined && (
              <Text semanticRole="alert" className="text-destructive">
                {props.setupStep}
              </Text>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
