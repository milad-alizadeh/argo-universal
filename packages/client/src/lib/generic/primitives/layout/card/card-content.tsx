import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { IconButtonBleed } from '#primitives/actions/icon-button';
import { Text } from '#primitives/content/text';
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
  return (
    <View className="gap-2 p-4">
      <CardHeader {...props} />
      {props.children}
    </View>
  );
}

// Each side lane is one title line tall, so the icon and the action sit on the title line.
function CardHeader(props: CardProps): ReactElement {
  return (
    <View className="flex-row items-start gap-4">
      <HeaderLane>{props.icon}</HeaderLane>
      <CardTitle title={props.title} subtitle={props.subtitle} />
      <ActionLane>{props.actions}</ActionLane>
    </View>
  );
}

// The title is a heading, so a screen reader can move between cards by their titles.
function CardTitle(props: Pick<CardProps, 'title' | 'subtitle'>): ReactElement {
  return (
    <View className="min-w-0 flex-1">
      <Text role="heading" accessibilityRole="heading" aria-level={3}>
        {props.title}
      </Text>
      {props.subtitle === undefined ? null : (
        <Text role="secondary" tone="muted">
          {props.subtitle}
        </Text>
      )}
    </View>
  );
}

function HeaderLane({ children }: { children?: ReactNode }): ReactNode {
  return children ? (
    <View className="h-6 min-w-6 wide-type:h-5 wide-type:min-w-5 shrink-0 items-center justify-center">
      {children}
    </View>
  ) : null;
}

// An IconButton's glyph sits on the card padding, as the icon does on the other side.
function ActionLane({ children }: { children?: ReactNode }): ReactNode {
  return children ? (
    <IconButtonBleed value>
      <View className="h-6 wide-type:h-5 shrink-0 flex-row items-center justify-end">
        {children}
      </View>
    </IconButtonBleed>
  ) : null;
}
