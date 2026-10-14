import { Form, List } from '@expo/ui/swift-ui';
import {
  listStyle,
  scrollContentBackground,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { FieldLayout } from '#primitives/fields/field-layout';
import { Host } from '#primitives/native/host';
import { useWide } from '../../../use-wide/use-wide';
import type { FieldGroupProps } from './field-group-props';
import { FieldGroup as WebFieldGroup } from './field-group.tsx';

export function FieldGroup(props: FieldGroupProps): React.JSX.Element {
  const wide = useWide();

  if (wide) return <WebFieldGroup {...props} />;

  return (
    <FieldLayout value={props.variant ?? 'grouped'}>
      <Host style={{ flex: 1 }} matchContents={false}>
        <PhoneFields variant={props.variant}>{props.children}</PhoneFields>
      </Host>
    </FieldLayout>
  );
}

// A navigation list is a plain List, flat like the sidebar; any other is a grouped Form on the system grouped background.
function PhoneFields({
  variant,
  children,
}: FieldGroupProps): React.JSX.Element {
  if (variant === 'navigation')
    return (
      <List modifiers={[listStyle('plain'), scrollContentBackground('hidden')]}>
        {children}
      </List>
    );

  return <Form>{children}</Form>;
}

FieldGroup satisfies React.ComponentType<FieldGroupProps>;
