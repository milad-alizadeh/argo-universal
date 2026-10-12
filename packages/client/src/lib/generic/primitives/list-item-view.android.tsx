import {
  Button,
  CircularProgressIndicator,
  Column,
  Shape,
  Row,
  Surface,
  Text,
} from '@expo/ui/jetpack-compose';
import {
  alpha,
  defaultMinSize,
  fillMaxWidth,
  padding,
  semantics,
  size,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '../native-theme';
import { iconPixels } from '../symbols/icon';
import { useWide } from '../use-wide';
import { useNavigationFields } from './field-layout';
import { type ListItemProps, listItemName } from './field-props';
import { RowSubtitle, RowTitle } from './list-item-compose-text';
import * as Web from './list-item-view.tsx';
import { NativeRowGlyph, NativeRowStatus } from './native-row';
import { useComposeTextStyle } from './native-typography';

const rowHeight = 56;
const tileRadius = 4;
const corners = Object.fromEntries(
  ['topStart', 'topEnd', 'bottomStart', 'bottomEnd'].map((k) => [
    k,
    tileRadius,
  ]),
);
const gutter = 16;
const verticalPadding = 8;
const disabledOpacity = 0.5;

export function ListItem(props: ListItemProps): React.JSX.Element {
  const wide = useWide();
  const background = useRowBackground();
  if (wide) return <Web.ListItem {...props} />;
  const rowProps = {
    shape: Shape.RoundedCorner({ cornerRadii: corners }),
    modifiers: [
      fillMaxWidth(),
      semantics({ contentDescription: listItemName(props) }),
    ],
  };
  if (!props.onPress)
    return (
      <Surface {...rowProps} color={background}>
        <RowContent {...props} />
      </Surface>
    );
  return (
    <Button
      {...rowProps}
      enabled={!props.disabled}
      onClick={props.onPress}
      colors={{
        containerColor: background,
        disabledContainerColor: background,
      }}
      contentPadding={{ start: 0, top: 0, end: 0, bottom: 0 }}
    >
      <RowContent {...props} />
    </Button>
  );
}

// A navigation row sits flat on the screen, like the sidebar's.
function useRowBackground(): string | undefined {
  const { muted } = useNativeTheme().colors;
  return useNavigationFields() ? 'transparent' : muted;
}

function RowContent(props: ListItemProps): React.JSX.Element {
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
      <RowLeading {...props} />
      <Column modifiers={[weight(1)]}>
        <RowTitle {...props} />
        <RowSubtitle subtitle={props.subtitle} />
      </Column>
      <RowTrailing {...props} />
    </Row>
  );
}

function RowLeading(
  props: Pick<ListItemProps, 'icon' | 'loading' | 'leading'>,
): React.JSX.Element | null {
  const { primary } = useNativeTheme().colors;
  const pixels = iconPixels('md');
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

function RowTrailing(props: ListItemProps): React.JSX.Element {
  const bodyStyle = useComposeTextStyle('body');
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
          style={{ ...bodyStyle, textAlign: 'end' }}
          modifiers={[weight(1)]}
        >
          {props.value}
        </Text>
      )}
      <NativeRowStatus {...props} />
    </Row>
  );
}
