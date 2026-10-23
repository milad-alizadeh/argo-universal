/* oxlint-disable anti-slop/no-shape-in-symbol-names -- SwiftUI's own modifier names. */
import { Button, HStack, Image, Spacer } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  contentShape,
  disabled,
  font,
  foregroundStyle,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import { RowTitle } from '#primitives/fields/field-row';
import type { NativeRowProps } from './field-picker-native';

type PageRowProps = NativeRowProps;

// Settings' disclosure: chevron.forward at footnote size, semibold, in the tertiary label colour.
const disclosureStyle = [
  font({ textStyle: 'footnote', weight: 'semibold' }),
  foregroundStyle({ type: 'hierarchical', style: 'tertiary' }),
];

// The whole row takes the press, not only its content.
export const wholeRowPress = contentShape(shapes.rectangle());

/*
 * What SwiftUI's `.navigationLink` Picker draws: the title, the chosen value in the muted tone and the disclosure
 * chevron, because pressing it pushes a page. The content shape lets the whole row take the press.
 */
export function PageRow(props: PageRowProps): ReactElement {
  return (
    <Button
      onPress={props.onPress}
      modifiers={[buttonStyle('plain'), disabled(props.disabled ?? false)]}
    >
      <HStack modifiers={[wholeRowPress]}>
        <RowTitle title={props.title} leading={props.leading} />
        <Spacer />
        <NativeText tone="muted">{props.summary}</NativeText>
        <Image systemName="chevron.forward" modifiers={disclosureStyle} />
      </HStack>
    </Button>
  );
}
