/* oxlint-disable anti-slop/no-shape-in-symbol-names -- Compose's own Shapes modifier. */
import { Box, useMaterialColors } from '@expo/ui/jetpack-compose';
import {
  background,
  clip,
  defaultMinSize,
  fillMaxWidth,
  padding,
  Shapes,
  type ModifierConfig,
} from '@expo/ui/jetpack-compose/modifiers';
import { type ReactElement, type ReactNode, useContext } from 'react';
import { cornerRadii, PositionContext } from '#primitives/fields/field-row';

/*
 * A Button's card in a section: a one-line row's height (Material's 56dp), and an inset that puts the button's
 * label on the rows' title line. A ListItem's content starts 16dp in and a TextButton's label 12dp into the
 * button, so the button starts 4dp in, left-aligned and its own width.
 */
const rowHeight = 56;

const buttonInset = 4;

export function ButtonCard(props: { children: ReactNode }): ReactElement {
  return (
    <Box contentAlignment="centerStart" modifiers={useCardModifiers()}>
      {props.children}
    </Box>
  );
}

function useCardModifiers(): ModifierConfig[] {
  const card = useMaterialColors().surfaceContainer;
  const corner = Shapes.RoundedCorner(cornerRadii(useContext(PositionContext)));

  return [
    fillMaxWidth(),
    defaultMinSize({ minHeight: rowHeight }),
    clip(corner),
    background(card),
    padding(buttonInset, 0, buttonInset, 0),
  ];
}
