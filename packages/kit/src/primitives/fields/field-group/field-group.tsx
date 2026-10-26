import { FieldGroup as ExpoFieldGroup } from '@expo/ui';
import { createModifier } from '@expo/ui/jetpack-compose/modifiers';
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { ViewStyle } from 'react-native';
import {
  type ContentColumn,
  OutsideColumn,
  useClaimColumn,
} from '#kit/content-column/content-column';
import { flattenedChildren } from '#kit/flattened-children';
import { useInMenu } from '#kit/menu-rows-context';
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

// Grouped cards claim the Screen's column and keep to it themselves; their rows are outside it.
function PageFieldGroup(props: FieldGroupProps): ReactElement {
  const style = columnStyle(useClaimColumn('grouped'));

  return (
    <Host style={{ flex: 1 }}>
      <InsideHostContext.Provider value>
        <OutsideColumn>
          <ColumnFieldGroup {...props} style={style} />
        </OutsideColumn>
      </InsideHostContext.Provider>
    </Host>
  );
}

function ColumnFieldGroup(
  props: FieldGroupProps & { style: ViewStyle },
): ReactElement {
  return (
    <ExpoFieldGroup
      disabled={props.disabled}
      style={props.style}
      modifiers={[hiddenFormBackground]}
    >
      {sections(props.children)}
    </ExpoFieldGroup>
  );
}

/*
 * A wide pane's column, as its header keeps to: the FieldGroup scrolls itself and takes no content style, so the
 * scroll view is the column. The cards' edges start on the page title's line, as every desktop page's content does;
 * Expo's web FieldGroup pads its content 16 on its own, so the column gives that up.
 */
function columnStyle(column: ContentColumn | undefined): ViewStyle {
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

// Expo's own content padding.
const columnGivenUp = 16;

/*
 * No background of its own, so the page's shows between the section cards. SwiftUI's Form draws its grouped
 * background behind its scroll content; Expo's plain modifier factory hides it without loading the ExpoUI native
 * module on the web, which ignores it.
 */
const transparent: ViewStyle = { backgroundColor: 'transparent' };

const hiddenFormBackground = createModifier('scrollContentBackground', {
  visible: 'hidden',
});

// A Fragment of sections opens in place, its sections keyed apart from the FieldGroup's own.
const sections = (children: ReactNode): ReactNode[] =>
  flattenedChildren(children).map(section);

function section(child: ReactNode): ReactNode {
  if (!isValidElement(child) || !isFieldGroupSection(child)) return child;

  return cloneElement(sectionElement(child.props), { key: child.key });
}

const isFieldGroupSection = (
  child: ReactElement,
): child is ReactElement<FieldGroupSectionProps> =>
  child.type === FieldGroupSection;

export const FieldGroup = Object.assign(FieldGroupRoot, {
  Section: FieldGroupSection,
  ...fieldGroupRowComponents,
});
