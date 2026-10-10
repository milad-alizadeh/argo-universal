import type * as React from 'react';
import { View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Composer, type ComposerProps } from '#features/composer';
import { Feed, type FeedProps } from '#features/feed';
import { Button } from '#lib/generic/primitives/button';
import { Text } from '#lib/generic/primitives/text';
import { LoadError, type LoadErrorProps } from '#lib/product/load-error';
import { keyboardAvoidingStyle, Screen } from '#lib/product/screen';
import { ScrollFade } from '#lib/product/scroll-fade';
import { useWide } from '../../../lib/generic/use-wide';
import { SessionHeader, type SessionHeaderProps } from './session-header';

export interface OpenSessionViewProps {
  header: SessionHeaderProps;
  feed: FeedProps;
  composer: ComposerProps;
  // Closes a Session that has no Turn yet; shown while its Feed is empty and no Turn runs.
  cancelCreation: { disabled: boolean; onCancel: () => void };
}

export type SessionViewProps =
  | { state: 'opening' }
  | { state: 'load-failed'; onRetry: () => void }
  | { state: 'open-failed'; message: string; onRetry: () => void }
  | ({ state: 'open' } & OpenSessionViewProps);

// How far above the Composer the Feed fades out; a phone starts it higher, so the pills above the Composer sit on a quiet surface.
const composerFadeHeight = { phone: 88, wide: 64 };

// One Session: its header, its Feed, and the Composer pinned below.
export function SessionView(props: SessionViewProps): React.JSX.Element {
  switch (props.state) {
    case 'opening':
      return <Screen edges={['bottom']} />;
    case 'load-failed':
      return (
        <CentredLoadError
          title="Couldn't load the Session"
          description="The Server didn't respond. Check that it's running, then retry."
          onRetry={props.onRetry}
        />
      );
    case 'open-failed':
      return (
        <CentredLoadError
          title="Couldn't open the Session"
          description={props.message}
          onRetry={props.onRetry}
        />
      );
    case 'open':
      return <OpenSessionView {...props} />;
  }
}

function CentredLoadError(props: LoadErrorProps): React.JSX.Element {
  return (
    <Screen edges={['bottom']}>
      <View className="flex-1 justify-center">
        <LoadError {...props} />
      </View>
    </Screen>
  );
}

function OpenSessionView({
  header,
  feed,
  composer,
  cancelCreation,
}: OpenSessionViewProps): React.JSX.Element {
  const wide = useWide();
  const fadeHeight = wide ? composerFadeHeight.wide : composerFadeHeight.phone;
  const configuration = composer.configuration && {
    ...composer.configuration,
    // A phone draws no checkout row above the Composer.
    checkout: {
      ...composer.configuration.checkout,
      path: wide ? composer.configuration.checkout.path : undefined,
    },
  };
  const creating =
    !composer.configuration?.turnRunning && feed.items.length === 0;

  return (
    <Screen edges={['bottom']}>
      <SessionHeader {...header} />
      <KeyboardAvoidingView
        behavior="padding"
        automaticOffset
        // Above an open keyboard the Composer keeps the 16 it has from the screen's sides.
        keyboardVerticalOffset={16}
        style={keyboardAvoidingStyle}
      >
        <Feed {...feed} />
        {/* The bottom slot: the Composer until request cards and banners land. */}
        <View className="relative z-10 -mt-12 items-center px-4 wide:px-6 wide:pb-4">
          {creating && (
            <Button
              variant="ghost"
              accessibilityLabel="Cancel creation"
              disabled={cancelCreation.disabled}
              onPress={cancelCreation.onCancel}
            >
              <Text>Cancel creation</Text>
            </Button>
          )}
          <View
            pointerEvents="none"
            className="absolute inset-x-0 top-16 bottom-0 bg-card"
          />
          <View
            pointerEvents="none"
            className="absolute inset-x-0 -top-6 wide:top-0"
            style={{ height: fadeHeight }}
          >
            <ScrollFade edge="bottom" className="bg-card" height={fadeHeight} />
          </View>
          <Composer {...composer} configuration={configuration} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
