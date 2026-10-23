import { FieldGroup as ExpoFieldGroup } from '@expo/ui';
import { createModifier } from '@expo/ui/jetpack-compose/modifiers';
import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { FieldLink } from '#primitives/fields/field-link';
import { FieldPicker } from '#primitives/fields/field-picker';
import { FieldSlider } from '#primitives/fields/field-slider';
import { FieldSecret, FieldText } from '#primitives/fields/field-text';
import { FieldToggle } from '#primitives/fields/field-toggle';
import { FieldValue } from '#primitives/fields/field-value';
import { Host, InsideHostContext } from '#primitives/native/host';
import type { FieldGroupKitProps } from '../../kit-props';
import {
  FieldGroupSection,
  type FieldGroupSectionProps,
  sectionElement,
} from './field-group-section';

export type FieldGroupProps = FieldGroupKitProps<'FieldGroup'> & {
  children?: ReactNode;
};

/*
 * ADR-0042: Expo UI's universal FieldGroup on the web and iOS (SwiftUI's Form), scrolling itself. It reads its
 * sections by element type, so each FieldGroup.Section child becomes Expo's own section element here, and nothing
 * else sits between it and them (the web draws any other child as a card of its own). Android
 * draws its own (field-group.android.tsx).
 */
function FieldGroupRoot(props: FieldGroupProps): ReactElement {
  return (
    <Host style={{ flex: 1 }}>
      <InsideHostContext.Provider value>
        <ExpoFieldGroup
          disabled={props.disabled}
          style={transparent}
          modifiers={[hiddenFormBackground]}
        >
          {sections(props.children)}
        </ExpoFieldGroup>
      </InsideHostContext.Provider>
    </Host>
  );
}

/*
 * No background of its own, so the page's shows between the section cards. SwiftUI's Form draws its grouped
 * background behind its scroll content; Expo's plain modifier factory hides it without loading the ExpoUI native
 * module on the web, which ignores it.
 */
const transparent = { backgroundColor: 'transparent' };

const hiddenFormBackground = createModifier('scrollContentBackground', {
  visible: 'hidden',
});

function sections(children: ReactNode): ReactNode {
  return Children.map(children, (child) => section(child));
}

function section(child: ReactNode): ReactNode {
  if (!isValidElement<{ children?: ReactNode }>(child)) return child;

  return child.type === Fragment ? (
    <Fragment>{sections(child.props.children)}</Fragment>
  ) : (
    fieldGroupSection(child)
  );
}

const fieldGroupSection = (child: ReactElement): ReactNode =>
  isFieldGroupSection(child) ? sectionElement(child.props) : child;

const isFieldGroupSection = (
  child: ReactElement,
): child is ReactElement<FieldGroupSectionProps> =>
  child.type === FieldGroupSection;

export const FieldGroup = Object.assign(FieldGroupRoot, {
  Section: FieldGroupSection,
  Value: FieldValue,
  Link: FieldLink,
  Toggle: FieldToggle,
  Picker: FieldPicker,
  Slider: FieldSlider,
  TextField: FieldText,
  SecretField: FieldSecret,
});
