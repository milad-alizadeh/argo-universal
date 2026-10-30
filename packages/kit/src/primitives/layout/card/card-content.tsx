import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { CollapsibleCardContent } from './card-collapsible';
import {
  ActionLane,
  CardBody,
  CardHeading,
  cardSpace,
  IconLane,
} from './card-parts';
import type { CardProps } from './card-props';

// The press layer's name: the header's own words unless the author gives one.
export function cardLabel(props: CardProps): string {
  return (
    props.accessibilityLabel ??
    [props.title, props.subtitle].filter(Boolean).join(', ')
  );
}

// A card without a press is a named group, as a ListItem row without one is; a pressable card's button carries the name.
export function CardGroup(
  props: CardProps & { children: ReactNode },
): ReactNode {
  if (props.onPress) return props.children;

  return (
    <View role="group" accessibilityLabel={cardLabel(props)}>
      {props.children}
    </View>
  );
}

// Everything below the media, inside the card padding: the header, then the body.
export function CardContent(props: CardProps): ReactElement {
  if (props.collapsible) return <CollapsibleCardContent {...props} />;

  const space = cardSpace(props);

  return (
    <View className={`${space.gap} ${space.padding}`}>
      <CardHeader {...props} />
      <CardBody>{props.children}</CardBody>
    </View>
  );
}

// Each side lane is one title line tall, so the icon and the action sit on the title line.
function CardHeader(props: CardProps): ReactElement {
  return (
    <View className="flex-row items-start gap-4">
      <IconLane>{props.icon}</IconLane>
      <CardTitle title={props.title} subtitle={props.subtitle} />
      <ActionLane>{props.actions}</ActionLane>
    </View>
  );
}

// The title is a heading, so a screen reader can move between cards by their titles.
function CardTitle(props: Pick<CardProps, 'title' | 'subtitle'>): ReactElement {
  return (
    <View className="min-w-0 flex-1">
      <CardHeading title={props.title} />
      {props.subtitle === undefined ? null : (
        <Text role="secondary" tone="muted">
          {props.subtitle}
        </Text>
      )}
    </View>
  );
}
