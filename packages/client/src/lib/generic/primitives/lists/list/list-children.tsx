import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  type ReactNode,
  type ReactElement,
} from 'react';
import { listPosition, type ListPosition } from '../../../list-context';
import type { ListSectionProps } from './list-props';
import { ListSection, SectionHeader, SectionFooter } from './list-section';

export interface ListChild {
  key: string;
  content: ReactNode;
  position: ListPosition;
}

function sectionChild(
  child: ReactNode,
): child is ReactElement<ListSectionProps> {
  return isValidElement<ListSectionProps>(child) && child.type === ListSection;
}

function hasHeader(props: ListSectionProps): boolean {
  return [
    props.title,
    props.leading,
    props.trailing,
    props.onExpandedChange,
  ].some(Boolean);
}

function headerEntries(props: ListSectionProps, key: string): ListChild[] {
  if (!hasHeader(props)) return [];

  return [
    {
      key: `${key}:header`,
      content: <SectionHeader {...props} />,
      position: 'only',
    },
  ];
}

function footerEntries(props: ListSectionProps, key: string): ListChild[] {
  return props.footer
    ? [
        {
          key: `${key}:footer`,
          content: <SectionFooter text={props.footer} />,
          position: 'only',
        },
      ]
    : [];
}

function sectionEntries(
  child: ReactElement<ListSectionProps>,
  key: string,
): ListChild[] {
  const props = child.props;

  const body =
    props.isExpanded === false ? [] : childEntries(props.children, key);

  return [...headerEntries(props, key), ...body, ...footerEntries(props, key)];
}

function entryKey(child: ReactNode, prefix: string, index: number): string {
  return `${prefix}/${isValidElement(child) ? child.key : index}`;
}

function fragmentChild(
  child: ReactNode,
): child is ReactElement<{ children?: ReactNode }> {
  return (
    isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
  );
}

function entriesOf(
  child: ReactNode,
  key: string,
  position: ListPosition,
): ListChild[] {
  if (sectionChild(child)) return sectionEntries(child, key);

  return [{ key, content: child, position }];
}

function nestedKey(child: ReactNode, prefix: string, index: number): ReactNode {
  return isValidElement(child)
    ? cloneElement(child, { key: `${prefix}/${child.key ?? index}` })
    : child;
}

function flattenedChildren(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) => {
    if (!fragmentChild(child)) return [child];

    return flattenedChildren(child.props.children).map((nested, index) =>
      nestedKey(nested, String(child.key), index),
    );
  });
}

export function childEntries(children: ReactNode, prefix = ''): ListChild[] {
  const entries = flattenedChildren(children);

  return entries.flatMap((child, index) =>
    entriesOf(
      child,
      entryKey(child, prefix, index),
      listPosition(index === 0, index === entries.length - 1),
    ),
  );
}
