import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { ProgressBar } from '#primitives/status/progress-bar';
import { Spinner } from '#primitives/status/spinner';
import type { SessionCalloutProps } from '../../types/session-callout';
import { MethodActions } from '../auth-callout/auth-callout';

// The existing picker owns the surface and sheet. Discovery adds only its content.
export function ConfigurationStatus(props: SessionCalloutProps): ReactElement {
  return <View className="gap-3 p-3">{content(props)}</View>;
}

function content(props: SessionCalloutProps): ReactElement {
  switch (props.kind) {
    case 'loading':
      return (
        <>
          <View className="flex-row items-center gap-2">
            <Spinner
              accessibilityLabel={props.title ?? 'Loading configuration…'}
            />
            <Text role="body" tone="muted">
              {props.title ?? 'Loading configuration…'}
            </Text>
          </View>
          {props.progress !== undefined && (
            <ProgressBar
              value={props.progress ?? 1}
              indeterminate={props.progress === null}
              active
              accessibilityLabel="Installing Agent"
            />
          )}
        </>
      );
    case 'launch':
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
    case 'auth-required':
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
    case 'authenticate':
      return (
        <>
          <View className="flex-row items-center gap-2">
            {props.pending && <Spinner accessibilityLabel="Signing in" />}
            <Text role="body" tone="muted">
              {props.pending ? 'Signing in…' : 'Sign in to load configuration.'}
            </Text>
          </View>
          {(props.failure || props.message) && (
            <Text role="secondary" tone="muted">
              {props.failure ?? props.message}
            </Text>
          )}
          <View className="items-start">
            {props.pending ? (
              <Button
                size="sm"
                label="Cancel"
                variant="secondary"
                onPress={props.onCancel}
              />
            ) : (
              <MethodActions {...props} />
            )}
          </View>
        </>
      );
  }
}
