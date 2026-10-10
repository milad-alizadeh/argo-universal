import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import {
  ComposerAgentModelControl,
  ComposerCheckoutControl,
  type ComposerConfigurationProps,
  StartSessionIn,
} from '#features/composer';
import { Button } from '#lib/generic/primitives/button';
import { Text } from '#lib/generic/primitives/text';
import { useContentWide } from '#lib/product/content-layout';
import { LoadError } from '#lib/product/load-error';
import { keyboardAvoidingStyle, Screen } from '#lib/product/screen';

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
  | { state: 'load-failed'; onRetry: () => void }
  | ({ state: 'ready' } & ReadyNewSessionViewProps);

// Opens the chosen Session with its model and effort before the first prompt.
export function NewSessionView(props: NewSessionViewProps): React.JSX.Element {
  switch (props.state) {
    case 'loading':
      return <Screen edges={['bottom']} />;
    case 'load-failed':
      return (
        <Screen edges={['bottom']}>
          <View className="flex-1 justify-center">
            <LoadError
              title="Couldn't load New Session"
              description="The Server didn't respond. Check that it's running, then retry."
              onRetry={props.onRetry}
            />
          </View>
        </Screen>
      );
    case 'ready':
      return <ReadyNewSessionView {...props} />;
  }
}

function NewSessionHeading(): React.JSX.Element {
  return (
    <View className="w-full max-w-composer gap-2 px-4">
      <Text role="heading" aria-level={1} className="type-title">
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
  return (
    <Screen edges={['bottom']}>
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
                accessibilityLabel="Open Session"
                disabled={!props.canOpen}
                onPress={props.onOpen}
              >
                {opening && (
                  <ActivityIndicator accessibilityLabel="Opening Session" />
                )}
                <Text>Open Session</Text>
              </Button>
            </View>
            {props.setupStep !== undefined && (
              <Text role="alert" className="text-destructive">
                {props.setupStep}
              </Text>
            )}
            {props.openError !== undefined && (
              <Text role="alert" className="text-destructive">
                Couldn't open the Session. {props.openError}
              </Text>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
