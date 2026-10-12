import {
  Button,
  CircularProgressIndicator,
  Column,
  Shape,
  Row,
  Surface,
} from '@expo/ui/jetpack-compose';
import {
  alpha,
  clearSemantics,
  defaultMinSize,
  fillMaxWidth,
  padding,
  semantics,
  size,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import type * as React from 'react';
import { useNativeTheme } from '../../../native-theme';
import { useIconPixels } from '../../../symbols/icon-role';
import { useWide } from '../../../use-wide/use-wide';
import { useNavigationFields } from '../../fields/field-layout';
import { type ListItemProps, listItemName } from '../../fields/field-props';
import { RowSubtitle, RowTitle } from './list-item-compose-text';
import { RowTrailing } from './list-item-compose-value';
import * as Web from './list-item-view.tsx';
import { NativeRowGlyph, NativeRowDetail } from './native-row';

const rowHeight = 56;
const tileRadius = 4;
const tileCorners = {
  topStart: tileRadius,
  topEnd: tileRadius,
  bottomStart: tileRadius,
  bottomEnd: tileRadius,
};
const gutter = 16;
const verticalPadding = 8;
const disabledOpacity = 0.5;

export function ListItem(props: ListItemProps): React.JSX.Element {
  const wide = useWide();
  const background = useRowBackground();
  if (wide) return <Web.ListItem {...props} />;
  const rowProps = {
    shape: Shape.RoundedCorner({ cornerRadii: tileCorners }),
    modifiers: [fillMaxWidth(), ...rowSemantics(props)],
  };
  if (!props.onPress)
    return (
      <Surface {...rowProps} color={background}>
        <Column>
          <RowContent {...props} />
          <NativeRowDetail detail={props.detail} />
        </Column>
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
      <Column>
        <RowContent {...props} />
        <NativeRowDetail detail={props.detail} />
      </Column>
    </Button>
  );
}

function rowName(props: ListItemProps): string {
  const name = listItemName(props);
  return props.selected ? `${name}, Selected` : name;
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
        ...headerModifiers(props),
      ]}
    >
      <RowLeading {...props} />
      <Column
        modifiers={[weight(1), ...(props.control ? [clearSemantics()] : [])]}
      >
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

function rowSemantics(props: ListItemProps): ReturnType<typeof semantics>[] {
  if (props.control || props.detail) return [];
  return [semantics({ contentDescription: rowName(props) })];
}
function headerModifiers(
  props: ListItemProps,
): NonNullable<React.ComponentProps<typeof Row>['modifiers']> {
  return [
    alpha(props.disabled ? disabledOpacity : 1),
    ...(props.detail ? [clearSemantics()] : []),
  ];
}
