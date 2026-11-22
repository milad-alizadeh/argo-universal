import { Button, HStack, Image, Spacer } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonStyle,
  contentShape,
  disabled,
  font,
  foregroundStyle,
  layoutPriority,
  padding,
  shapes,
} from '@expo/ui/swift-ui/modifiers';
import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { NativeText } from '#primitives/content/native-text';
import { RowTitle } from '#primitives/fields/field-row';
import { FieldStatusDot } from '../field-row/field-status-dot.ios';
import { FieldLinkMark } from './field-link-mark';
import type { FieldLinkRowProps } from './field-link-props';
import { linkLabel, linkTone } from './field-link-tone';

// Settings' disclosure: chevron.forward at footnote size, semibold, in the tertiary label colour.
const disclosureStyle = [
  font({ textStyle: 'footnote', weight: 'semibold' }),
  foregroundStyle({ type: 'hierarchical', style: 'tertiary' }),
  layoutPriority(1),
];

const pressArea = contentShape(shapes.rectangle());

const rowModifiers = [pressArea];

const roomyRowModifiers = [padding({ vertical: 6 }), pressArea];

/*
 * A pressable row that opens a page: a plain Button, so its title keeps the label colour, ending in what the page
 * holds in the secondary colour and the stock disclosure chevron, as Settings' General > About rows do. The content
 * shape lets the whole row take the press. A row that performs an action opens no page, so it ends in no chevron.
 */
export function FieldLink(props: FieldLinkRowProps): ReactElement {
  return (
    <Button onPress={props.onPress} modifiers={pressing(props)}>
      <HStack modifiers={props.roomy ? roomyRowModifiers : rowModifiers}>
        {props.leadingMark ? <FieldLinkMark mark={props.leadingMark} /> : null}
        <LinkTitle {...props} />
        <Spacer />
        {props.status?.tone && <FieldStatusDot tone={props.status.tone} />}
        <LinkValue value={props.value} />
        <Disclosure action={props.action} />
      </HStack>
    </Button>
  );
}

function LinkTitle(props: FieldLinkRowProps): ReactElement {
  return (
    <RowTitle
      {...props}
      tone={linkTone(props)}
      subtitleLines={props.wrapSubtitle ? undefined : 1}
    />
  );
}

const Disclosure = (props: { action?: boolean }): ReactElement | null =>
  props.action ? null : (
    <Image systemName="chevron.forward" modifiers={disclosureStyle} />
  );

// A long value gives way before the title does: it takes one line and truncates, so the title stays whole (#1750).
const valueModifiers = [layoutPriority(-1)];

const LinkValue = (props: { value?: string }): ReactElement | null =>
  props.value ? (
    <NativeText tone="muted" numberOfLines={1} modifiers={valueModifiers}>
      {props.value}
    </NativeText>
  ) : null;

const pressing = (props: FieldLinkRowProps): ModifierConfig[] => [
  buttonStyle('plain'),
  disabled(props.disabled ?? false),
  ...(props.status ? [accessibilityLabel(linkLabel(props))] : []),
];
