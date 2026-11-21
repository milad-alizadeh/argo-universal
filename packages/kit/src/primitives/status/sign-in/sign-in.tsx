import type * as React from 'react';
import { View } from 'react-native';
import { inColumn, useClaimColumn } from '#kit/content-column/content-column';
import { Text } from '#primitives/content/text';
import { FieldGroup } from '#primitives/fields/field-group';
import type { SignInProps } from './sign-in-props';

const headerStyle = { gap: 16, paddingBottom: 8 };

/*
 * A Plugin's sign-in, laid out as Settings is. The header keeps to the column the Screen offers; the rows are a
 * FieldGroup, which claims the column itself.
 */
export function SignIn(props: SignInProps): React.JSX.Element {
  const column = useClaimColumn();

  return (
    <View className="flex-1">
      <View style={inColumn(column, headerStyle)}>
        <SignInHeader {...props} />
        <LooseFooter {...props} />
      </View>
      <SignInRows {...props} />
    </View>
  );
}

// With no rows, the footer sits under the header instead.
function LooseFooter(props: SignInProps): React.ReactNode {
  if (props.children !== undefined || !props.footer) return null;

  return (
    <Text role="secondary" tone="muted">
      {props.footer}
    </Text>
  );
}

function SignInRows(props: SignInProps): React.ReactNode {
  if (props.children === undefined) return null;

  return (
    <FieldGroup>
      <FieldGroup.Section footer={props.footer}>
        {props.children}
      </FieldGroup.Section>
    </FieldGroup>
  );
}

function SignInHeader(props: SignInProps): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-4">
      <SignInMark {...props} />
      <SignInTitles {...props} />
    </View>
  );
}

function SignInTitles(props: SignInProps): React.JSX.Element {
  return (
    <View className="flex-1 gap-0.5">
      <Text accessibilityRole="heading" aria-level={2} role="heading">
        {props.title}
      </Text>
      {!!props.description && (
        <Text role="secondary" tone="muted">
          {props.description}
        </Text>
      )}
    </View>
  );
}

// The service's own artwork on a rounded tile; its initial while nothing supplies one.
function SignInMark(props: SignInProps): React.JSX.Element {
  const signedIn = props.signedIn === true;

  return (
    <View
      accessible
      accessibilityLabel={props.service}
      accessibilityRole="image"
      className={markClass(signedIn)}
    >
      {props.mark ?? <Initial service={props.service} signedIn={signedIn} />}
    </View>
  );
}

function Initial(props: {
  service: string;
  signedIn: boolean;
}): React.JSX.Element {
  return (
    <Text role="title" tone={props.signedIn ? 'success' : 'info'}>
      {initialOf(props.service)}
    </Text>
  );
}

const markClass = (signedIn: boolean): string =>
  `size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-card p-2.5 ${signedIn ? 'border-success' : 'border-border'}`;

const initialOf = (service: string): string => {
  const point = service.codePointAt(0);

  return point === undefined ? '' : String.fromCodePoint(point).toUpperCase();
};
