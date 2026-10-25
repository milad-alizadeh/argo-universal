import { FieldGroup as ExpoFieldGroup } from '@expo/ui';
import { createModifier } from '@expo/ui/jetpack-compose/modifiers';
import {
  Children,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
  use,
} from 'react';
import type { ViewStyle } from 'react-native';
import {
  groupedRowInset,
  HeadingInsetContext,
  useGroupedContent,
} from '#kit/heading-inset';
import { useInMenu } from '#kit/menu-rows-context';
import { ScrollColumnContext } from '#kit/scroll-column';
import { Host, InsideHostContext } from '#primitives/native/host';
import type { FieldGroupKitProps } from '../../kit-props';
import { MenuFieldGroup } from './field-group-menu';
import { fieldGroupRowComponents } from './field-group-row-components';
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
  return useInMenu() ? (
    <MenuFieldGroup>{props.children}</MenuFieldGroup>
  ) : (
    <PageFieldGroup {...props} />
  );
}

function PageFieldGroup(props: FieldGroupProps): ReactElement {
  useGroupedContent();

  return (
    <Host style={{ flex: 1 }}>
      <InsideHostContext.Provider value>
        <HeadingInsetContext value={undefined}>
          <ColumnFieldGroup {...props} />
        </HeadingInsetContext>
      </InsideHostContext.Provider>
    </Host>
  );
}

// The FieldGroup takes the pane's column and clears it, so nothing in its rows takes it again.
function ColumnFieldGroup(props: FieldGroupProps): ReactElement {
  const style = useColumnStyle();

  return (
    <ScrollColumnContext value={undefined}>
      <ExpoFieldGroup
        disabled={props.disabled}
        style={style}
        modifiers={[hiddenFormBackground]}
      >
        {sections(props.children)}
      </ExpoFieldGroup>
    </ScrollColumnContext>
  );
}

/*
 * A wide pane's column, as its header keeps to: the FieldGroup scrolls itself and takes no content style, so the
 * scroll view is the column. The cards stand out of it by their rows' 16 inset, so the section titles and row titles
 * start on the page title's line; Expo's web FieldGroup pads its content 16 on its own, so the column gives up both.
 */
function useColumnStyle(): ViewStyle {
  const column = use(ScrollColumnContext);

  if (!column) return transparent;

  return {
    ...transparent,
    width: '100%',
    maxWidth: column.maxWidth,
    alignSelf: 'center',
    paddingLeft: Math.max(0, column.paddingLeft - columnGivenUp),
    paddingRight: Math.max(0, column.paddingRight - columnGivenUp),
  };
}

// Expo's own content padding, and the rows' inset the cards stand out by.
const expoContentPadding = 16;

const columnGivenUp = expoContentPadding + groupedRowInset;

/*
 * No background of its own, so the page's shows between the section cards. SwiftUI's Form draws its grouped
 * background behind its scroll content; Expo's plain modifier factory hides it without loading the ExpoUI native
 * module on the web, which ignores it.
 */
const transparent: ViewStyle = { backgroundColor: 'transparent' };

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
  ...fieldGroupRowComponents,
});
