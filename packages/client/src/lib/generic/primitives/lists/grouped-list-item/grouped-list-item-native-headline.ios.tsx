// Split from Android: the universal ListItem lays its leading slot out in a plain stack, so only SwiftUI's Label lines a Form row's titles up the stock way.
import { Button, Column, Row } from '@expo/ui';
import { Label } from '@expo/ui/swift-ui';
import { buttonStyle, frame } from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import {
  rowHasHeadlineAction,
  rowActionAccessibility,
} from './grouped-list-item-accessibility';
import type { ResolvedItemProps } from './grouped-list-item-props';
import { hasLeadingSlot } from './grouped-list-item-styles';
import { RowTitles } from './grouped-list-item-titles';
import { NativeRowLeading } from './native-row';

/*
 * The row's icon and titles as one Label: the List sizes the icon to the title's text style, starts
 * every title at one edge whatever each glyph's width, and starts the separator under the title.
 */
export function RowHeadline(props: ResolvedItemProps): React.JSX.Element {
  const label = labelFor(props);

  if (!rowHasHeadlineAction(props)) return label;

  return (
    <Button
      onPress={props.onPress}
      modifiers={[buttonStyle('borderless'), ...rowActionAccessibility(props)]}
    >
      {label}
    </Button>
  );
}

const labelFor = (props: ResolvedItemProps): React.JSX.Element =>
  props.variant === 'card' ? (
    <CardHeadline {...props} />
  ) : (
    <HeadlineLabel {...props} />
  );

function HeadlineLabel(props: ResolvedItemProps): React.JSX.Element {
  return (
    <Label
      icon={hasLeadingSlot(props) ? <NativeRowLeading {...props} /> : undefined}
      modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}
    >
      <RowTitles {...props} />
    </Label>
  );
}

const cardSpacing = 12;

const fillHeadline = [frame({ maxWidth: Infinity, alignment: 'leading' })];

function CardHeadline(props: ResolvedItemProps): React.JSX.Element {
  return (
    <Row alignment="start" spacing={cardSpacing} modifiers={fillHeadline}>
      <NativeRowLeading {...props} />
      <Column modifiers={fillHeadline}>
        <RowTitles {...props} />
      </Column>
    </Row>
  );
}
