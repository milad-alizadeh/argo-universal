import {
  CircularProgressIndicator,
  Column,
  Row,
} from '@expo/ui/jetpack-compose';
import {
  alpha,
  defaultMinSize,
  fillMaxWidth,
  padding,
  size,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '../../../native-theme';
import { useIconPixels } from '../../../symbols/icon-role';
import { RowSubtitle, RowTitle } from './grouped-list-item-compose-text';
import { RowTrailing } from './grouped-list-item-compose-value';
import type { GroupedListItemProps } from './grouped-list-item-props';
import { NativeRowGlyph } from './native-row';

const rowHeight = 56;

const gutter = 16;

const verticalPadding = 8;

const disabledOpacity = 0.5;

type RowModifiers = NonNullable<React.ComponentProps<typeof Row>['modifiers']>;

export function RowContent(props: GroupedListItemProps): React.JSX.Element {
  return (
    <Row
      horizontalArrangement={{ spacedBy: gutter }}
      verticalAlignment="center"
      modifiers={contentModifiers(props)}
    >
      <RowLeading {...props} />
      <RowText {...props} />
      <RowTrailing {...props} />
    </Row>
  );
}

function contentModifiers(props: GroupedListItemProps): RowModifiers {
  return [
    fillMaxWidth(),
    defaultMinSize({ minHeight: rowHeight }),
    padding(gutter, verticalPadding, gutter, verticalPadding),
    ...headerModifiers(props),
  ];
}

function RowText(props: GroupedListItemProps): React.JSX.Element {
  return (
    <Column modifiers={[weight(1)]}>
      <RowTitle {...props} />
      <RowSubtitle subtitle={props.subtitle} />
    </Column>
  );
}

function RowLeading(
  props: Pick<GroupedListItemProps, 'icon' | 'loading' | 'leading'>,
): React.JSX.Element | null {
  const { primary } = useNativeTheme().colors;
  const pixels = useIconPixels('row');

  if (props.loading)
    return (
      <CircularProgressIndicator
        color={primary}
        trackColor="transparent"
        modifiers={[size(pixels, pixels)]}
      />
    );

  return <NativeRowGlyph {...props} />;
}

function headerModifiers(props: GroupedListItemProps): RowModifiers {
  return [alpha(props.disabled ? disabledOpacity : 1)];
}
