import { Button, Divider, HStack, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  background,
  buttonStyle,
  frame,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { type ReactNode, useContext } from 'react';
import { useNativeTheme } from '../../../native-theme';
import { iconPixels } from '../../../symbols/icon';
import { FieldRowEnd } from '../../fields/field-layout';
import type { ListItemProps } from '../../fields/field-props';
import { hasLeadingSlot } from './list-item-styles';
import { inset, rowAccessibility, rowSpacing } from './list-item-swift-ui';

/*
 * A row in a Host of its own, outside any Form, as a virtualised list holds it: it draws the
 * Form's grouped surface and inset separator itself, and the list rounds the card's ends.
 */
export function HostedListItem({
  children,
  ...props
}: ListItemProps & { children: ReactNode }): React.JSX.Element {
  const content = <HostedRowSurface {...props}>{children}</HostedRowSurface>;
  if (!props.onPress)
    return <VStack modifiers={rowAccessibility(props)}>{content}</VStack>;
  return (
    <Button
      onPress={props.onPress}
      modifiers={[
        buttonStyle('plain'),
        ...rowAccessibility(props),
        accessibilityAddTraits(['isButton']),
      ]}
    >
      {content}
    </Button>
  );
}

function HostedRowSurface({
  children,
  ...props
}: ListItemProps & { children: ReactNode }): React.JSX.Element {
  const { muted } = useNativeTheme().colors;
  return (
    <VStack
      spacing={0}
      alignment="leading"
      modifiers={[
        frame({ maxWidth: Infinity, alignment: 'leading' }),
        background(muted ?? 'transparent'),
      ]}
    >
      <HStack modifiers={[padding({ horizontal: inset })]}>{children}</HStack>
      <RowSeparator {...props} />
    </VStack>
  );
}

// The last row of a section has none.
function RowSeparator(props: ListItemProps): React.JSX.Element | null {
  const last = useContext(FieldRowEnd) ?? true;
  if (last) return null;
  return <Divider modifiers={[padding({ leading: separatorInset(props) })]} />;
}

// The separator starts under the title, as a Form's does.
const separatorInset = (props: ListItemProps): number =>
  inset + (hasLeadingSlot(props) ? iconPixels('lg') + rowSpacing : 0);
