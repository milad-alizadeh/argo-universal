import { Column, ListItem } from '@expo/ui';
import * as Material from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { useNativeTheme } from '#lib/generic/native-theme';
import { useSidebarList } from '#primitives/fields/field-layout';
import type { NativeRowFrameProps } from './native-row-frame-props';
import { NativeRowFrame as FlatRow } from './native-row-frame.tsx';

const innerCorner = 4;

// Stock ListItem owns each tile and its ripple, including rows returned through caller components.
export function NativeRowFrame(props: NativeRowFrameProps): ReactElement {
  return useSidebarList() ? <FlatRow {...props} /> : <MaterialRow {...props} />;
}

function MaterialRow(props: NativeRowFrameProps): ReactElement {
  return (
    <ListItem
      colors={useRowColors()}
      onPress={props.item.disabled ? undefined : props.item.onPress}
      modifiers={frameModifiers(props)}
    >
      <Column spacing={0} disabled={props.item.disabled}>
        {props.children}
      </Column>
    </ListItem>
  );
}

function useRowColors(): React.ComponentProps<typeof ListItem>['colors'] {
  const colors = useNativeTheme().colors;

  return {
    containerColor: colors.card,
    contentColor: colors.foreground,
    leadingContentColor: colors.foreground,
    trailingContentColor: colors.mutedForeground,
    supportingContentColor: colors.mutedForeground,
  };
}

function frameModifiers(
  props: NativeRowFrameProps,
): NativeRowFrameProps['modifiers'] {
  return [
    ...props.modifiers,
    Material.clip(Material.Shapes.RoundedCorner(innerCorner)),
  ];
}
