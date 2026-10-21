import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { Spinner } from '@repo/kit/primitives/status/spinner';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import type {
  KindProps,
  SessionCalloutProps,
} from '../../types/session-callout';
import { AuthenticationStatus } from './configuration-authentication';
import { InstallationProgress } from './installation-progress';

// The existing picker owns the surface and sheet. Discovery adds only its content.
export function ConfigurationStatus(props: SessionCalloutProps): ReactElement {
  return <View className="gap-3 p-3">{content(props)}</View>;
}

function content(props: SessionCalloutProps): ReactElement {
  if (props.kind === 'loading') return <LoadingStatus {...props} />;

  return settledStatus(props);
}

function settledStatus(
  props: Exclude<SessionCalloutProps, KindProps<'loading'>>,
): ReactElement {
  switch (props.kind) {
    case 'launch':
      return <LaunchStatus {...props} />;
    case 'auth-required':
      return <AuthRequiredStatus {...props} />;
    default:
      return <AuthenticationStatus {...props} />;
  }
}

function LoadingStatus(props: KindProps<'loading'>): ReactElement {
  const title = props.title ?? 'Loading configuration…';

  return (
    <>
      <View className="flex-row items-center gap-2">
        <Spinner accessibilityLabel={title} />
        <Text role="body" tone="muted">
          {title}
        </Text>
      </View>
      <InstallationProgress progress={props.progress} />
    </>
  );
}

function LaunchStatus(props: KindProps<'launch'>): ReactElement {
  return (
    <>
      <Text role="body" tone="muted">
        Couldn’t load configuration.
      </Text>
      <Text role="secondary" tone="muted">
        {props.message}
      </Text>
      <View className="items-start">
        <Button size="sm" label="Retry" onPress={props.onRetry} />
      </View>
    </>
  );
}

function AuthRequiredStatus(props: KindProps<'auth-required'>): ReactElement {
  return (
    <>
      <Text role="body" tone="muted">
        {props.description ?? 'Sign in to load configuration.'}
      </Text>
      <View className="items-start">
        <Button size="sm" label="Sign in" onPress={props.onAuthenticate} />
      </View>
    </>
  );
}
