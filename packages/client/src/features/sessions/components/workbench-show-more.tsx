import { Text } from '@repo/kit/primitives/content/text';
import type { ReactElement } from 'react';
import { Pressable } from 'react-native';
import {
  StackedSummary,
  type StackedSummaryIcon,
} from '../../../lib/product/stacked-summary';

interface Props {
  // Live items the card left out, and settled ones it counts.
  more: number;
  done: number;
  // The settled items' marks, stacked ahead of the counts when given.
  icons?: readonly StackedSummaryIcon[];
  onOpen: () => void;
}

const label = ({ more, done }: Pick<Props, 'more' | 'done'>): string =>
  [more > 0 && `${more} more`, done > 0 && `${done} done`]
    .filter(Boolean)
    .join(' · ');

const pressable = (props: Props) =>
  ({
    role: 'button',
    accessibilityLabel: `Show ${label(props)}`,
    onPress: props.onOpen,
    className: `rounded-control ${props.icons?.length ? '' : 'px-2 py-2 '}web:hover:bg-hover web:focus-visible:bg-hover`,
  }) as const;

// The footer of a card that draws only its live items: it names the rest and opens the section's full list.
export function WorkbenchShowMore(props: Props): ReactElement | null {
  if (props.more + props.done === 0) return null;

  return (
    <Pressable {...pressable(props)}>
      <ShowMoreLabel {...props} />
    </Pressable>
  );
}

function ShowMoreLabel(props: Props): ReactElement {
  if (props.icons?.length)
    return <StackedSummary icons={props.icons} texts={[label(props)]} />;

  return (
    <Text role="secondary" tone="muted">
      {label(props)}
    </Text>
  );
}
