import { FieldGroup as ExpoFieldGroup } from '@expo/ui';
import { createModifier } from '@expo/ui/jetpack-compose/modifiers';
import { cloneElement, type ReactElement, type ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { flattenedChildren } from '#kit/flattened-children';
import type { FieldGroupKitProps } from '../../kit-props';
import { sectionElement } from './field-group-section';
import { isFieldGroupSection } from './field-group-section-mark';

type FormProps = FieldGroupKitProps<'FieldGroup'> & {
  children?: ReactNode;
  style: ViewStyle;
  // SwiftUI modifiers beside the hidden background, such as the aside's disabled scrolling.
  modifiers?: ReturnType<typeof createModifier>[];
};

// The one Form the page and the aside draw: Expo UI's universal FieldGroup, its sections Expo's own.
export function ColumnFieldGroup(props: FormProps): ReactElement {
  return (
    <ExpoFieldGroup
      disabled={props.disabled}
      style={props.style}
      modifiers={[hiddenFormBackground, ...(props.modifiers ?? [])]}
    >
      {sections(props.children)}
    </ExpoFieldGroup>
  );
}

/*
 * No background of its own, so the page's shows between the section cards. SwiftUI's Form draws its grouped
 * background behind its scroll content; Expo's plain modifier factory hides it without loading the ExpoUI native
 * module on the web, which ignores it.
 */
export const transparent: ViewStyle = { backgroundColor: 'transparent' };

const hiddenFormBackground = createModifier('scrollContentBackground', {
  visible: 'hidden',
});

// A Fragment of sections opens in place, its sections keyed apart from the FieldGroup's own.
const sections = (children: ReactNode): ReactNode[] =>
  flattenedChildren(children).map(section);

function section(child: ReactNode): ReactNode {
  if (!isFieldGroupSection(child)) return child;

  return cloneElement(sectionElement(child.props), { key: child.key });
}
