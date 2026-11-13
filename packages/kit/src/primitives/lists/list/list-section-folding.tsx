import { Icon } from '#primitives/content/icon';
import type { ListTree } from './list-level-entries';
import type { ListSectionProps } from './list-props';
import { prepareSection, type SectionState } from './list-section-state';
import type { TreeFolding } from './list-tree-rows';

export type { SectionState } from './list-section-state';

const folder = (folded: boolean): React.JSX.Element => (
  <Icon name={folded ? 'folder' : 'folder-open'} />
);

function foldedProps(
  props: ListSectionProps,
  key: string,
  folding: TreeFolding,
): ListSectionProps {
  const folded = folding.folded.has(key);

  return {
    ...props,
    leading: props.leading ?? folder(folded),
    isExpanded: !folded,
    onExpandedChange: () => folding.toggle(key),
  };
}

/*
 * A collapsible Section folds as a parent row does, by the List's own folding: it starts open, and its title folds it
 * under a closed folder, as the Sessions list's Projects do.
 */
const foldable = (
  props: ListSectionProps,
  key: string,
  folding: TreeFolding,
): ListSectionProps =>
  props.collapsible ? foldedProps(props, key, folding) : props;

// A Section of a List, read as the List folds it.
export const preparedSection = (
  props: ListSectionProps,
  key: string,
  tree: ListTree,
): SectionState =>
  prepareSection(foldable(props, key, tree.folding), key, tree.footerShown);
