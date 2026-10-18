// Split from Android: SwiftUI's Form scrolls the sections here, while Android scrolls them in React Native for its sheets.
import { FieldGroup } from '@expo/ui';
import { List, VStack } from '@expo/ui/swift-ui';
import {
  listStyle,
  listSectionSpacing,
  padding,
  scrollContentBackground,
} from '@expo/ui/swift-ui/modifiers';
import type * as React from 'react';
import { useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import {
  FieldLayout,
  SidebarSelectionContext,
  useSizedToContent,
} from '#primitives/fields/field-layout';
import {
  StackedGutter,
  useStackedGutter,
} from '#primitives/lists/grouped-list-item';
import { Host } from '#primitives/native/host';
import { useNativeTheme } from '../../../native-theme';
import type { GroupedListProps } from './grouped-list-props';
import { compactGroupedListGap } from './grouped-list-spacing';

type SidebarSelection = NonNullable<
  React.ContextType<typeof SidebarSelectionContext>
>;

// A grouped Form's space above and below its sections, and between them; its gutter follows the width.
const stackInset = 16;

const stackSectionGap = 20;

/*
 * SwiftUI draws the list at every size class: the window's width moves the panes, not the drawing.
 * A list that fills its pane is a Form; a list sized to its content stacks the same rows.
 */
export function GroupedList(props: GroupedListProps): React.JSX.Element {
  const fit = useSizedToContent() || props.fit;

  return fit ? <StackedList {...props} /> : <FilledList {...props} />;
}

function FilledList(props: GroupedListProps): React.JSX.Element {
  return (
    <FieldLayout value={props.variant ?? 'grouped'}>
      <Host style={{ flex: 1 }} matchContents={false}>
        <PhoneFields {...props} />
      </Host>
    </FieldLayout>
  );
}

/*
 * A Form scrolls lazily at the height its parent gives it, so it has no height of its own to fit:
 * the rows stack in a VStack (VStack/index.d.ts: `spacing`) that the Host measures, and React
 * Native scrolls them only once they outgrow the space they are given.
 */
function StackedList(props: GroupedListProps): React.JSX.Element {
  return (
    <FieldLayout value="stacked">
      <StackedGutter>
        <ScrollView className="shrink" keyboardShouldPersistTaps="handled">
          <Host matchContents={{ vertical: true }} style={{ width: '100%' }}>
            <StackedSections {...props} />
          </Host>
        </ScrollView>
      </StackedGutter>
    </FieldLayout>
  );
}

function StackedSections(props: GroupedListProps): React.JSX.Element {
  return (
    <VStack
      spacing={props.gap === 'sm' ? compactGroupedListGap : stackSectionGap}
      modifiers={[
        padding({ horizontal: useStackedGutter(), vertical: stackInset }),
      ]}
    >
      {props.children}
    </VStack>
  );
}

/*
 * A sidebar list is a plain List, flat like the sidebar; any other is a grouped FieldGroup.
 * The universal List takes no modifiers, so the plain, backgroundless sidebar List stays SwiftUI's.
 */
function PhoneFields({
  variant,
  children,
  gap,
}: GroupedListProps): React.JSX.Element {
  return variant === 'sidebar' ? (
    <SidebarFields>{children}</SidebarFields>
  ) : (
    <GroupedFields gap={gap}>{children}</GroupedFields>
  );
}

// The sidebar's List shows the open page as its selection, and choosing a row opens that row's page.
function SidebarFields({
  children,
}: Pick<GroupedListProps, 'children'>): React.JSX.Element {
  const [selection, shown] = useSidebarListSelection();

  return (
    <SidebarSelectionContext value={selection}>
      <SidebarList selection={selection} shown={shown}>
        {children}
      </SidebarList>
    </SidebarSelectionContext>
  );
}

function useSidebarListSelection(): [SidebarSelection, string | undefined] {
  const [shown, show] = useState<string>();

  const selection = useMemo<SidebarSelection>(
    () => ({ choices: new Map(), show }),
    [],
  );

  return [selection, shown];
}

type SidebarListProps = Pick<GroupedListProps, 'children'> & {
  selection: SidebarSelection;
  shown: string | undefined;
};

function SidebarList(props: SidebarListProps): React.JSX.Element {
  return (
    <List
      selection={props.shown === undefined ? [] : [props.shown]}
      onSelectionChange={([tag]) => choose(props.selection, tag)}
      modifiers={[listStyle('plain'), scrollContentBackground('hidden')]}
    >
      {props.children}
    </List>
  );
}

function choose(
  selection: SidebarSelection,
  tag: string | number | undefined,
): void {
  if (typeof tag === 'string') selection.choices.get(tag)?.();
}

function GroupedFields({
  children,
  gap,
}: Pick<GroupedListProps, 'children' | 'gap'>): React.JSX.Element {
  const { content } = useNativeTheme().colors;

  return (
    <FieldGroup
      style={{ backgroundColor: content }}
      modifiers={[scrollContentBackground('hidden'), sectionSpacing(gap)]}
    >
      {children}
    </FieldGroup>
  );
}

GroupedList satisfies React.ComponentType<GroupedListProps>;

const sectionSpacing = (
  gap: GroupedListProps['gap'],
): ReturnType<typeof listSectionSpacing> =>
  listSectionSpacing(gap === 'sm' ? compactGroupedListGap : 'default');
