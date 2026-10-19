import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { Spinner } from '#primitives/status/spinner';
import type { KindProps } from '../../types/session-callout';
import { MethodActions } from '../auth-callout/auth-callout';

type Authentication = KindProps<'authenticate'>;

function Actions(props: Authentication): ReactElement {
  if (!props.pending) return <MethodActions {...props} />;

  return (
    <Button
      size="sm"
      label="Cancel"
      variant="secondary"
      onPress={props.onCancel}
    />
  );
}

function Message(props: Authentication): ReactElement | null {
  if (![props.failure, props.message].some(Boolean)) return null;

  return (
    <Text role="secondary" tone="muted">
      {props.failure ?? props.message}
    </Text>
  );
}

function Heading({ pending }: Authentication): ReactElement {
  return (
    <View className="flex-row items-center gap-2">
      {pending && <Spinner accessibilityLabel="Signing in" />}
      <Text role="body" tone="muted">
        {pending ? 'Signing in…' : 'Sign in to load configuration.'}
      </Text>
    </View>
  );
}

export function AuthenticationStatus(props: Authentication): ReactElement {
  return (
    <>
      <Heading {...props} />
      <Message {...props} />
      <View className="items-start">
        <Actions {...props} />
      </View>
    </>
  );
}
