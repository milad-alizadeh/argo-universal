import { cardDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '#kit/utils';
import { Text } from '#primitives/content/text';
import type { CardProps } from './card-props';

type CardDensity = NonNullable<CardProps['density']>;

type CardSpace = {
  padding: string;
  gap: string;
  bodyTop: string;
};

/*
 * The card's padding and the space under its title line, per density: compact suits cards stacked in a narrow
 * column. A plain card spaces its header and body with a gap; a collapsible one insets its folding body instead.
 * The body starts on the card's padding like the title does, whatever it holds.
 */
const densitySpace: Record<CardDensity, CardSpace> = {
  regular: { padding: 'p-4', gap: 'gap-2', bodyTop: 'pt-2' },
  compact: {
    padding: 'px-3 py-2.5',
    gap: 'gap-1',
    bodyTop: 'pt-1',
  },
};

export const cardSpace = (props: Pick<CardProps, 'density'>): CardSpace =>
  densitySpace[props.density ?? cardDefaults.density];

// The title is a heading, so a screen reader can move between cards by their titles.
export function CardHeading({ title }: Pick<CardProps, 'title'>): ReactElement {
  return (
    <Text role="heading" accessibilityRole="heading" aria-level={3}>
      {title}
    </Text>
  );
}

// A side lane is one title line tall, so what it holds sits on the title line; it draws nothing when it holds nothing.
function TitleLine(props: {
  children?: ReactNode;
  className: string;
}): ReactNode {
  return props.children ? (
    <View className={cn('h-6 wide-type:h-5 shrink-0', props.className)}>
      {props.children}
    </View>
  ) : null;
}

export const ActionLane = ({
  children,
}: {
  children?: ReactNode;
}): ReactNode => (
  <TitleLine className="flex-row items-center justify-end">
    {children}
  </TitleLine>
);

export const IconLane = ({ children }: { children?: ReactNode }): ReactNode => (
  <TitleLine className="min-w-6 wide-type:min-w-5 items-center justify-center">
    {children}
  </TitleLine>
);

// The body and the footer, on the card's own edge; nothing when the card holds neither.
export function CardBody(props: Pick<CardProps, 'children'>): ReactNode {
  return props.children ? <View>{props.children}</View> : null;
}
