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
 * Android: React Native content in a section, in a card of its own as every row of the section has. A FieldGroup is
 * one Compose tree and draws only Compose views, so React Native views put in it are measured outside the column and
 * draw past its edge or not at all. The card takes the column's width and keeps its content a row's inset from the rounded edge; the content is laid out at that width, read from
 * the card, and gives the card its height. Inside it Compose has ended, so a kit Host draws a Host of its own again.
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
