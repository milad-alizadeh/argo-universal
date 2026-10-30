import {
  cloneElement,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { flattenedChildren } from '../../../flattened-children';
import { isSection } from './list-level-entries';
import type { ListSectionProps } from './list-props';

export interface PlaceholderRowProps {
  title: string;
  subtitle: string;
  leading: ReactNode;
}

type RowDrawing = ComponentType<PlaceholderRowProps>;

// The row ListItem hands in, once its module loads.
interface RowRegistry {
  Row?: RowDrawing;
}

const placeholder: RowRegistry = {};

/*
 * A placeholder row is a row like any other, so the List's appearance, surface, separators and row heights are the
 * ones the Skeleton measures. ListItem hands its drawing in, as it hands in the Move to… picker, since this folder
 * cannot import ListItem, which imports it.
 */
export function drawsPlaceholderRows(component: RowDrawing): void {
  placeholder.Row = component;
}

/*
 * The rows a List with none of its own draws inside a loading Skeleton. The words are never shown: the Skeleton
 * measures the lines they lay out and draws a bar over each, so what is written here is a width. They differ in
 * length so the rows read as a list, not a stamp.
 */
const placeholderWords = [
  { title: 'Placeholder title', subtitle: 'A longer placeholder subtitle' },
  { title: 'Short title', subtitle: 'Short subtitle' },
  { title: 'A middling placeholder', subtitle: 'Placeholder subtitle' },
] as const;

/*
 * A bundle that draws a List without ever drawing a ListItem has no row to hand in, so the rows are their own
 * lines. A loading List must never fall through to its `empty` slot, which would say there is none of what it is
 * still waiting for.
 */
const lineRow = (title: string): ReactElement => (
  <Text key={title} role="row">
    {title}
  </Text>
);

const row = (
  Row: RowDrawing | undefined,
  words: (typeof placeholderWords)[number],
): ReactElement =>
  Row === undefined ? (
    lineRow(words.title)
  ) : (
    <Row key={words.title} {...words} leading={<Icon name="folder" />} />
  );

const placeholderRows = (): ReactElement[] =>
  placeholderWords.map((words) => row(placeholder.Row, words));

export const hasNoRows = (props: Pick<ListSectionProps, 'children'>): boolean =>
  flattenedChildren(props.children).length === 0;

// A Section with no rows of its own takes placeholder rows; one with rows keeps them.
const withPlaceholderRows = (props: ListSectionProps): ListSectionProps =>
  hasNoRows(props) ? { ...props, children: placeholderRows() } : props;

// A List's children inside a loading Skeleton: each Section with no rows of its own takes placeholder rows.
export const placeholderChildren = (children: ReactNode): ReactNode =>
  flattenedChildren(children).map((child) =>
    isSection(child)
      ? cloneElement(child, withPlaceholderRows(child.props))
      : child,
  );
