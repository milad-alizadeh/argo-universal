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
import { NativeText } from '#primitives/content/native-text';
import { RowTitle } from '#primitives/fields/field-row';
import type { FieldGroupKitProps } from '../../kit-props';

// Settings' disclosure: chevron.forward at footnote size, semibold, in the tertiary label colour.
const disclosureStyle = [
  font({ textStyle: 'footnote', weight: 'semibold' }),
  foregroundStyle({ type: 'hierarchical', style: 'tertiary' }),
];

/*
 * A pressable row that opens a page: a plain Button, so its title keeps the label colour, ending in what the page
 * holds in the secondary colour and the stock disclosure chevron, as Settings' General > About rows do. The content
 * shape lets the whole row take the press. A row that performs an action opens no page, so it ends in no chevron.
 */
export function FieldLink(
  props: FieldGroupKitProps<'FieldGroup.Link'>,
): ReactElement {
  return (
    <Button onPress={props.onPress} modifiers={pressing(props.disabled)}>
      <HStack modifiers={[contentShape(shapes.rectangle())]}>
        <RowTitle {...props} />
        <Spacer />
        <LinkValue value={props.value} />
        <Disclosure action={props.action} />
      </HStack>
    </Button>
  );
}

const Disclosure = (props: { action?: boolean }): ReactElement | null =>
  props.action ? null : (
    <Image systemName="chevron.forward" modifiers={disclosureStyle} />
  );

const LinkValue = (props: { value?: string }): ReactElement | null =>
  props.value ? <NativeText tone="muted">{props.value}</NativeText> : null;

const pressing = (off: boolean | undefined): ModifierConfig[] => [
  buttonStyle('plain'),
  disabled(off ?? false),
];
