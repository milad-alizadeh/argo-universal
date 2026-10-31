import { Box, RNHostView, useMaterialColors } from '@expo/ui/jetpack-compose';
import {
  background,
  clip,
  fillMaxWidth,
  onSizeChanged,
  Shapes,
  type ModifierConfig,
} from '@expo/ui/jetpack-compose/modifiers';
import { type ReactElement, type ReactNode, useContext, useState } from 'react';
import { View } from 'react-native';
import { rowInset } from '#kit/list-look-insets';
import { cornerRadii, PositionContext } from '#primitives/fields/field-row';
import { InsideHostContext } from '#primitives/native/host';

/*
 * Android: React Native content in a section, in a card like its rows. A FieldGroup is one Compose tree, so React
 * Native views put straight in it are measured outside the column and draw past its edge or not at all. The content
 * is laid out at the card's measured width; inside it a kit Host draws a Host of its own again.
 */
export function HostedSectionContent(props: {
  children: ReactNode;
}): ReactElement {
  const [width, setWidth] = useState<number>();

  return (
    <Box modifiers={useCardModifiers(setWidth)}>
      {width === undefined ? null : (
        <AtWidth width={width}>{props.children}</AtWidth>
      )}
    </Box>
  );
}

function AtWidth(props: { width: number; children: ReactNode }): ReactElement {
  return (
    <RNHostView matchContents>
      <View
        collapsable={false}
        style={{ width: props.width, padding: rowInset }}
      >
        <InsideHostContext.Provider value={false}>
          {props.children}
        </InsideHostContext.Provider>
      </View>
    </RNHostView>
  );
}

function useCardModifiers(onWidth: (width: number) => void): ModifierConfig[] {
  const card = useMaterialColors().surfaceContainer;
  const corner = Shapes.RoundedCorner(cornerRadii(useContext(PositionContext)));

  return [
    fillMaxWidth(),
    clip(corner),
    background(card),
    onSizeChanged((size) => onWidth(size.width)),
  ];
}
