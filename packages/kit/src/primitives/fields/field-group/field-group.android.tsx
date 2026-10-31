import { Column as ComposeColumn, LazyColumn } from '@expo/ui/jetpack-compose';
import {
  fillMaxSize,
  fillMaxWidth,
  height,
  imePadding,
} from '@expo/ui/jetpack-compose/modifiers';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import {
  fieldGroupColumnStyle,
  OutsideColumn,
  useClaimColumn,
} from '#kit/content-column/content-column';
import { flattenedChildren } from '#kit/flattened-children';
import { GroupDisabledContext } from '#primitives/fields/field-row';
import { Host, InsideHostContext } from '#primitives/native/host';
import type { FieldGroupKitProps } from '../../kit-props';
import {
  contentPadding,
  rowSpacing,
  sectionBreakHeight,
} from './field-group-caption-insets';
import { fieldGroupRowComponents } from './field-group-row-components';
import { FieldGroupSection } from './field-group-section.android';

export type FieldGroupProps = FieldGroupKitProps<'FieldGroup'> & {
  children?: ReactNode;
};

/*
 * ADR-0042: the kit's own Android FieldGroup, a copy of Expo UI's (FieldGroup.android.tsx) whose Section draws
 * each row as itself. It goes when Expo fixes the headline wrapping (expo/expo#50086).
 */
function FieldGroupRoot(props: FieldGroupProps): ReactElement {
  /*
   * Its cards keep Material's own inset, so the Screen adds no gutter beyond the column's own; its rows are outside the column.
   * The Host is the column, as the web's scroll view is: capped and centred, so the cards start on the title's line.
   */
  const column = fieldGroupColumnStyle(useClaimColumn('grouped'));

  return (
    <Host style={{ flex: 1, ...column }}>
      <GroupDisabledContext.Provider value={props.disabled ?? false}>
        <InsideHostContext.Provider value>
          <OutsideColumn>
            <Column>{props.children}</Column>
          </OutsideColumn>
        </InsideHostContext.Provider>
      </GroupDisabledContext.Provider>
    </Host>
  );
}

/*
 * Expo's layout (field-group-caption-insets.ts) as a LazyColumn. It fills the page and has no background of its
 * own, so the page's shows between the section cards. It ends above the keyboard, so Compose scrolls a focused
 * field into view as it does in any Material form. Each section break is an item of its own, so two sections
 * never read as one list of rows whatever the sheet or page they sit in.
 */
function Column(props: Pick<FieldGroupProps, 'children'>): ReactElement {
  return (
    <LazyColumn
      verticalArrangement={{ spacedBy: rowSpacing }}
      contentPadding={contentPadding}
      modifiers={[fillMaxSize(), imePadding()]}
    >
      {withBreaks(groupSections(props.children))}
    </LazyColumn>
  );
}

const breakModifiers = [fillMaxWidth(), height(sectionBreakHeight)];

const withBreaks = (sections: ReactNode[]): ReactNode[] =>
  sections.flatMap((section, index) =>
    index === 0
      ? [section]
      : [
          <ComposeColumn
            key={`break-${keyOf(section)}`}
            modifiers={breakModifiers}
          />,
          section,
        ],
  );

const groupSections = (children: ReactNode): ReactNode[] =>
  flattenedChildren(children)
    .reduce<ReactNode[][]>(addChild, [])
    .map(toSection);

const isSection = (child: ReactNode): boolean =>
  isValidElement(child) && child.type === FieldGroupSection;

const startsRun = (child: ReactNode, last: ReactNode[] | undefined): boolean =>
  isSection(child) || last === undefined || isSection(last[0]);

function addChild(runs: ReactNode[][], child: ReactNode): ReactNode[][] {
  const last = runs.at(-1);

  if (startsRun(child, last)) return [...runs, [child]];

  return [...runs.slice(0, -1), [...(last ?? []), child]];
}

const keyOf = (node: ReactNode): string =>
  isValidElement(node) ? String(node.key) : '';

const toSection = (run: ReactNode[]): ReactNode =>
  isSection(run[0]) ? (
    run[0]
  ) : (
    <FieldGroupSection key={`implicit-${keyOf(run[0])}`}>
      {run}
    </FieldGroupSection>
  );

export const FieldGroup = Object.assign(FieldGroupRoot, {
  Section: FieldGroupSection,
  ...fieldGroupRowComponents,
});
