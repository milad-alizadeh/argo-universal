import { cloneElement, isValidElement, type ReactNode } from 'react';
import { flattenedChildren } from '../../../flattened-children';
import type { ListProps } from './list-props';

type SearchRow = {
  title?: string;
  subtitle?: string;
  value?: string;
  children?: ReactNode;
};

function matches(node: ReactNode, query: string): boolean {
  if (!isValidElement<SearchRow>(node)) return false;

  return [node.props.title, node.props.subtitle, node.props.value].some(
    (text) => text?.toLocaleLowerCase().includes(query),
  );
}

function filteredChild(child: ReactNode, query: string): ReactNode[] {
  if (!isValidElement<SearchRow>(child)) return [];

  return filteredRow(child, query);
}

function filteredRow(
  child: React.ReactElement<SearchRow>,
  query: string,
): ReactNode[] {
  if (child.props.children === undefined) return matchedChild(child, query);
  const children = filteredChildren(child.props.children, query);

  return children.length > 0 ? [cloneElement(child, {}, children)] : [];
}

function filteredChildren(children: ReactNode, query: string): ReactNode[] {
  return flattenedChildren(children).flatMap((child) =>
    filteredChild(child, query),
  );
}

export function filterList<Item>(
  props: ListProps<Item>,
  text: string,
): ListProps<Item> {
  const query = text.trim().toLocaleLowerCase();

  if (!hasAppQuery(props.searchMode, query)) return props;

  if (props.items === undefined)
    return { ...props, children: filteredChildren(props.children, query) };

  return {
    ...props,
    items: props.items.filter((item, index) =>
      matches(props.renderItem(item, index), query),
    ),
  };
}

function matchedChild(child: ReactNode, query: string): ReactNode[] {
  return matches(child, query) ? [child] : [];
}

function hasAppQuery(
  mode: ListProps<never>['searchMode'],
  query: string,
): boolean {
  return mode === 'app' && query !== '';
}
