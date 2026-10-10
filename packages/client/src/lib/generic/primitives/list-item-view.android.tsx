import { Button, Shape, Row, Surface, Text } from '@expo/ui/jetpack-compose';
import {
  alpha,
  defaultMinSize,
  fillMaxWidth,
  padding,
  semantics,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '../native-theme';
import { useWide } from '../use-wide';
import { type ListItemProps, listItemName } from './field-props';
import * as Web from './list-item-view.tsx';
import { NativeRowIcon, NativeRowStatus } from './native-row';

const rowHeight = 56;
const tileRadius = 4;
const gutter = 16;
const verticalPadding = 8;
const disabledOpacity = 0.5;

export function ListItem(props: ListItemProps): React.JSX.Element {
  const wide = useWide();
  const { muted } = useNativeTheme().colors;
  if (wide) return <Web.ListItem {...props} />;
  const rowProps = {
    shape: Shape.RoundedCorner({
      cornerRadii: {
        topStart: tileRadius,
        topEnd: tileRadius,
        bottomStart: tileRadius,
        bottomEnd: tileRadius,
      },
    }),
    modifiers: [
      fillMaxWidth(),
      semantics({ contentDescription: listItemName(props) }),
    ],
  };
  if (!props.onPress)
    return (
      <Surface {...rowProps} color={muted}>
        <RowContent {...props} />
      </Surface>
    );
  return (
    <Button
      {...rowProps}
      enabled={!props.disabled}
      onClick={props.onPress}
      colors={{ containerColor: muted, disabledContainerColor: muted }}
      contentPadding={{ start: 0, top: 0, end: 0, bottom: 0 }}
    >
      <RowContent {...props} />
    </Button>
  );
}

function RowContent(props: ListItemProps): React.JSX.Element {
  const { foreground } = useNativeTheme().colors;
  return (
    <Row
      horizontalArrangement={{ spacedBy: gutter }}
      verticalAlignment="center"
      modifiers={[
        fillMaxWidth(),
        defaultMinSize({ minHeight: rowHeight }),
        padding(gutter, verticalPadding, gutter, verticalPadding),
        alpha(props.disabled ? disabledOpacity : 1),
      ]}
    >
      {props.icon && <NativeRowIcon icon={props.icon} />}
      <Text
        color={foreground}
        style={{ typography: 'bodyLarge' }}
        modifiers={[weight(1)]}
      >
        {props.title}
      </Text>
      <RowTrailing {...props} />
    </Row>
  );
}

function RowTrailing(props: ListItemProps): React.JSX.Element {
  const { mutedForeground } = useNativeTheme().colors;
  return (
    <Row
      horizontalArrangement={{ spacedBy: gutter }}
      verticalAlignment="center"
      modifiers={props.value === undefined ? [] : [weight(1)]}
    >
      {props.value !== undefined && (
        <Text
          color={mutedForeground}
          style={{ typography: 'bodyMedium', textAlign: 'end' }}
          modifiers={[weight(1)]}
        >
          {props.value}
        </Text>
      )}
      <NativeRowStatus {...props} />
    </Row>
  );
}
