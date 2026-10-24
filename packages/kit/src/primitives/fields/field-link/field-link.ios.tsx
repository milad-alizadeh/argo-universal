import { Button, HStack, Image, Spacer } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  contentShape,
  disabled,
  font,
  foregroundStyle,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { RowTitle } from '#primitives/fields/field-row';
import type { FieldGroupKitProps } from '../../kit-props';

// Settings' disclosure: chevron.forward at footnote size, semibold, in the tertiary label colour.
const disclosureStyle = [
  font({ textStyle: 'footnote', weight: 'semibold' }),
  foregroundStyle({ type: 'hierarchical', style: 'tertiary' }),
];

/*
 * A pressable row that opens a page: a plain Button, so its title keeps the label colour, ending in the stock
 * disclosure chevron. The content shape lets the whole row take the press.
 */
export function FieldLink(
  props: FieldGroupKitProps<'FieldGroup.Link'>,
): ReactElement {
  return (
    <Button onPress={props.onPress} modifiers={pressing(props.disabled)}>
      <HStack modifiers={[contentShape(shapes.rectangle())]}>
        <RowTitle {...props} />
        <Spacer />
        <Image systemName="chevron.forward" modifiers={disclosureStyle} />
      </HStack>
    </Button>
  );
}

const pressing = (off: boolean | undefined): ModifierConfig[] => [
  buttonStyle('plain'),
  disabled(off ?? false),
];
