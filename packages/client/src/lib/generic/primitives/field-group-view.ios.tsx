import { Form } from '@expo/ui/swift-ui';
import {
  background,
  scrollContentBackground,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '../native-theme';
import { useWide } from '../use-wide';
import { FieldGroup as WebFieldGroup } from './field-group-view.tsx';
import type { FieldGroupProps } from './field-props';
import { Host } from './host';

export function FieldGroup(props: FieldGroupProps): React.JSX.Element {
  const wide = useWide();
  const { colors } = useNativeTheme();
  if (wide) return <WebFieldGroup {...props} />;
  return (
    <Host style={{ flex: 1 }} matchContents={false}>
      <Form
        modifiers={[
          scrollContentBackground('hidden'),
          background(colors.background ?? 'transparent'),
        ]}
      >
        {props.children}
      </Form>
    </Host>
  );
}
