import { Column } from '@expo/ui';
import { fillMaxWidth, weight } from '@expo/ui/jetpack-compose/modifiers';
import type { ModifierConfig } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement, ReactNode } from 'react';
import {
  NativeText,
  type NativeTextRole,
} from '#primitives/content/native-text';
import type { TextProps, TextRole } from '#primitives/content/text';
import { useSizeClassValue } from '../../../use-size-class/use-size-class-value';

// Compose's Column takes no more width than its content unless told, so a layout outside a row fills the row's width.
export const stackModifiers = (inRow: boolean): ModifierConfig[] | undefined =>
  inRow ? undefined : [fillMaxWidth()];

// A child that takes the room the others leave, as Compose's weight does in a Row.
export const Grow = (props: { children: ReactNode }): ReactElement => (
  <Column modifiers={[weight(1)]}>{props.children}</Column>
);

type LineProps = {
  text: string;
  role: TextProps['role'];
  tone: TextProps['tone'];
};

const roles: Partial<Record<TextRole, NativeTextRole>> = {
  title: 'heading',
  heading: 'heading',
  control: 'control',
  secondary: 'secondary',
  'secondary-code': 'secondary',
  'row-detail': 'secondary',
  badge: 'secondary',
};

export function Line(props: LineProps): ReactElement {
  const role = useSizeClassValue(props.role);

  return (
    <NativeText role={roles[role ?? 'body']} tone={props.tone}>
      {props.text}
    </NativeText>
  );
}
