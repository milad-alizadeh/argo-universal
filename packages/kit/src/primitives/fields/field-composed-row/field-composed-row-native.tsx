import { Column } from '@expo/ui';
import { font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement, ReactNode } from 'react';
import { NativeText, useTextColor } from '#primitives/content/native-text';
import type { TextProps, TextRole } from '#primitives/content/text';
import { useSizeClassValue } from '../../../use-size-class/use-size-class-value';


// The iOS drawing, which the Android file replaces. SwiftUI's Column fills the width its parent leaves, so a layout needs nothing more.
export const stackModifiers = (_inRow: boolean): ModifierConfig[] | undefined =>
  undefined;

// A child that takes the room the others leave: a Column fills the width.
export const Grow = (props: { children: ReactNode }): ReactElement => (
  <Column>{props.children}</Column>
);

const detailRoles: ReadonlySet<TextRole | undefined> = new Set([
  'secondary',
  'secondary-code',
  'row-detail',
  'badge',
]);

type LineProps = { text: string; role: TextProps['role']; tone: TextProps['tone'] };

// A row's second line as a stock row draws it: one text style down, in the secondary shade, unless a tone says otherwise.
const roleModifiers = (role: TextRole | undefined): ModifierConfig[] =>
  detailRoles.has(role)
    ? [
        font({ textStyle: 'subheadline' }),
        foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
      ]
    : [];

export function Line(props: LineProps): ReactElement {
  const color = useTextColor(props.tone);
  const role = useSizeClassValue(props.role);

  return (
    <NativeText
      modifiers={[
        ...roleModifiers(role),
        ...(color === undefined ? [] : [foregroundStyle(color)]),
      ]}
    >
      {props.text}
    </NativeText>
  );
}
