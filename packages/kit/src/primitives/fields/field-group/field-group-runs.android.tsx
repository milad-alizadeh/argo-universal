import { Column as ComposeColumn } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, height } from '@expo/ui/jetpack-compose/modifiers';
import { isValidElement, type ReactNode } from 'react';
import { flattenedChildren } from '#kit/flattened-children';
import { sectionBreakHeight } from './field-group-caption-insets';
import { isFieldGroupSection as isSection } from './field-group-section-mark';
import { FieldGroupSection } from './field-group-section.android';

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

/*
 * A FieldGroup's children as Compose items: rows outside a Section gathered into one of their own, and a break
 * between sections, so two sections never read as one list of rows.
 */
export const sectionedRows = (children: ReactNode): ReactNode[] =>
  withBreaks(groupSections(children));
