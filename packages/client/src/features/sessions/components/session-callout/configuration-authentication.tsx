import { Button } from '@repo/kit/primitives/actions/button';
import { Markdown } from '@repo/kit/primitives/content/markdown';
import { Text } from '@repo/kit/primitives/content/text';
import { Spinner } from '@repo/kit/primitives/status/spinner';
import type { ReactElement } from 'react';
import { View } from 'react-native';
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
  const text = props.failure ?? props.message;

  if (!text) return null;

  return <Markdown text={text} tone="muted" selectable />;
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
