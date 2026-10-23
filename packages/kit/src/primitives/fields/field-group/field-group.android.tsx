import { LazyColumn } from '@expo/ui/jetpack-compose';
import { fillMaxSize, imePadding } from '@expo/ui/jetpack-compose/modifiers';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { flattenedChildren } from '#kit/flattened-children';
import { GroupDisabledContext } from '#primitives/fields/field-row';
import { Host, InsideHostContext } from '#primitives/native/host';
import type { FieldGroupKitProps } from '../../kit-props';
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
  return (
    <Host style={{ flex: 1 }}>
      <GroupDisabledContext.Provider value={props.disabled ?? false}>
        <InsideHostContext.Provider value>
          <Column>{props.children}</Column>
        </InsideHostContext.Provider>
      </GroupDisabledContext.Provider>
    </Host>
  );
}

/*
 * Expo's layout: a LazyColumn with 24dp between sections and 16dp around them. It fills the page and has no
 * background of its own, so the page's shows between the section cards. It ends above the keyboard, so Compose
 * scrolls a focused field into view as it does in any Material form.
 */
const sectionSpacing = 24;

const contentPadding = { start: 16, end: 16, top: 16, bottom: 16 };

function Column(props: Pick<FieldGroupProps, 'children'>): ReactElement {
  return (
    <LazyColumn
      verticalArrangement={{ spacedBy: sectionSpacing }}
      contentPadding={contentPadding}
      modifiers={[fillMaxSize(), imePadding()]}
    >
      {groupSections(props.children)}
    </LazyColumn>
  );
}

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
