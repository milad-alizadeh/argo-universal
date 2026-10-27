import { Children, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { flattenedChildren } from '#kit/flattened-children';
import { cn } from '#kit/utils';
import { NativeText } from '#primitives/content/native-text';
import { expandInlinePickers } from '#primitives/fields/field-picker';
import { RowFrame } from '#primitives/fields/field-row';
import { Host, InsideHostContext } from '#primitives/native/host';
import type { FieldGroupSectionProps } from './field-group-section';

/*
 * A FieldGroup inside a desktop or web popover draws its rows flat on the popover: Expo's card, its border and the
 * lines between rows are left out, and each row keeps the tint and radius of a menu row. Pages and sheets keep the card.
 * The rows still sit in a Host: Expo's Switch and Slider colour themselves from the variables it sets.
 */
export function MenuFieldGroup(props: { children?: ReactNode }): ReactElement {
  return (
    <Host>
      <InsideHostContext.Provider value>
        <View className="gap-2">{props.children}</View>
      </InsideHostContext.Provider>
    </Host>
  );
}

export function MenuSection(props: FieldGroupSectionProps): ReactElement {
  return (
    <View>
      <MenuCaption inset="pb-1" text={props.title} role={titleRole} />
      {menuRows(props.children)}
      <MenuCaption inset="pt-2" text={props.footer} role="secondary" />
    </View>
  );
}

const titleRole = 'heading';

type CaptionProps = {
  text: string | undefined;
  inset: string;
  role: 'heading' | 'secondary';
};

function MenuCaption(props: CaptionProps): ReactElement | null {
  if (!props.text) return null;

  return (
    <View className={cn('px-4', props.inset)}>
      <NativeText
        role={props.role}
        tone={props.role === 'secondary' ? 'muted' : undefined}
      >
        {props.text}
      </NativeText>
    </View>
  );
}

// Each row sits in its own rounded tile with the 16px inset Expo's row wrapper gives it.
function menuRows(children: ReactNode): ReactNode {
  return Children.map(
    flattenedChildren(expandInlinePickers(flattenedChildren(children))),
    (row) => (
      <View className="justify-center overflow-hidden rounded-xl px-4">
        <RowFrame>{row}</RowFrame>
      </View>
    ),
  );
}
