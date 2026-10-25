import { useId, useMemo, type ReactNode, type ReactElement } from 'react';
import type { ListPosition, ListSelection } from '../../../list-context';
import { useInMenu } from '../../../menu-rows-context';
import { childRenderers } from './list-child-renderers';
import type { ChildrenOptions } from './list-children-options';
import { FixedListRow } from './list-grouping';
import type { ListProps } from './list-props';
import { sectionEntries, menuEntries } from './list-section-entries';
import { prepareChildren, type ListBlock } from './list-section-model';

export interface ListChild extends ListSelection {
  key: string;
  fullSpan?: boolean;
  content: ReactNode;
  position: ListPosition;
}

export function childRenderer(
  appearance: ListProps<never>['appearance'],
): (item: ListChild) => ReactElement {
  const render = (item: ListChild): ReactElement => (
    <FixedListRow item={item} appearance={appearance} />
  );

  childRenderers.add(render);

  return render;
}

interface PreparedChildren {
  blocks: ListBlock[];
  items: ListChild[];
  shelves: boolean;
}

export function usePreparedChildren(props: ChildrenOptions): PreparedChildren {
  const menu = useInMenu();
  const blocks = useChildBlocks(props.children);

  const shelves = hasShelves(props, blocks);

  const entries = useMemo(
    () => (shelves ? [] : sectionEntries(blocks)),
    [blocks, shelves],
  );

  return { blocks, shelves, items: menu ? menuEntries(entries) : entries };
}

function useChildBlocks(children: ReactNode): ListBlock[] {
  const id = useId();

  return useMemo(() => prepareChildren(children, id), [children, id]);
}

function hasShelves(props: ChildrenOptions, blocks: ListBlock[]): boolean {
  return (
    props.direction === 'horizontal' &&
    blocks.some((block) => block.kind === 'section')
  );
}
