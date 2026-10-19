import { isValidElement, type ReactNode, type ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { FooterProvider } from '#primitives/fields/field-description';
import {
  listPosition,
  type ListPosition,
  type ListSelection,
} from '../../../list-context';
import { ListFooter } from '../../../list-footer';
import { useInMenu } from '../../../menu-rows-context';
import { flattenedChildren } from './list-child-nodes';
import type { ListSectionProps } from './list-props';
import { ListSection } from './list-section';
import { hasSectionHeader, SectionHeader } from './list-section-parts';

export interface ListChild extends ListSelection {
  key: string;
  content: ReactNode;
  position: ListPosition;
}

function sectionChild(
  child: ReactNode,
): child is ReactElement<ListSectionProps> {
  return isValidElement<ListSectionProps>(child) && child.type === ListSection;
}

function headerEntries(props: ListSectionProps, key: string): ListChild[] {
  if (!hasSectionHeader(props)) return [];

  return [
    {
      key: `${key}:header`,
      content: <SectionHeader {...props} />,
      position: 'only',
    },
  ];
}

function footerEntries(props: ListSectionProps, key: string): ListChild[] {
  if (!props.footer || Platform.OS === 'android') return [];

  return [
    {
      key: `${key}:footer`,
      content: footerContent(props, key),
      position: 'only',
    },
  ];
}

function footerContent(props: ListSectionProps, key: string): ReactNode {
  return (
    <ListFooter
      id={`${key}:footer`}
      text={props.footer ?? ''}
      tone={props.tone}
    />
  );
}

function sectionEntries(
  child: ReactElement<ListSectionProps>,
  key: string,
): ListChild[] {
  const props = child.props;

  const body = props.isExpanded === false ? [] : selectedEntries(props, key);

  return [
    ...headerEntries(props, key),
    ...body,
    ...footerEntries(props, key),
    { key: `${key}:gap`, position: 'only', content: <SectionGap /> },
  ];
}

// Paper Combobox 9BM-0: a popover's groups sit 8px apart; other lists keep 16px between sections.
function SectionGap(): ReactElement {
  return <View className={useInMenu() ? 'h-2' : 'h-4'} />;
}

// A popover's last group ends at the popover's own inset, with no gap below it.
export function menuEntries(entries: ListChild[]): ListChild[] {
  return entries.at(-1)?.key.endsWith(':gap') ? entries.slice(0, -1) : entries;
}

function selectedEntries(props: ListSectionProps, key: string): ListChild[] {
  return childEntries(props.children, key).map((entry) => ({
    ...entry,
    content: (
      <SectionContent section={props} id={`${key}:footer`}>
        {entry.content}
      </SectionContent>
    ),
    ...sectionSelection(props, entry),
  }));
}

function entryKey(child: ReactNode, prefix: string, index: number): string {
  return `${prefix}/${isValidElement(child) ? child.key : index}`;
}

function entriesOf(
  child: ReactNode,
  key: string,
  position: ListPosition,
): ListChild[] {
  if (sectionChild(child)) return sectionEntries(child, key);

  return [{ key, content: child, position }];
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

function SectionContent({
  section,
  id,
  children,
}: {
  section: ListSectionProps;
  id: string;
  children: ReactNode;
}): ReactElement {
  const footer = section.footer
    ? { id, failure: section.tone === 'danger' }
    : undefined;

  return <FooterProvider value={footer}>{children}</FooterProvider>;
}

function sectionSelection(
  props: ListSectionProps,
  entry: ListChild,
): ListSelection {
  return props.selectionMode
    ? {
        selectionMode: props.selectionMode,
        selection: props.selection,
        onSelectionChange: props.onSelectionChange,
      }
    : entry;
}
