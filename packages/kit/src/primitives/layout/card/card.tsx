import { cardDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Surface, type SurfaceProps } from '#primitives/layout/surface';
import { CardContent, CardGroup, cardLabel } from './card-content';
import type { CardProps } from './card-props';

export type { CardProps } from './card-props';

// Desktop, web and iOS: Argo draws the card on the card Surface (SwiftUI has no stock card).
export function Card(props: CardProps): ReactElement {
  return (
    <Surface kind={props.kind ?? cardDefaults.kind} {...surfaceProps(props)}>
      <CardGroup {...props}>
        <CardMedia media={props.media} />
        <CardContent {...props} />
      </CardGroup>
    </Surface>
  );
}

// A collapsible card's toggle is its title, so the Surface presses nothing and takes its content's height.
function surfaceProps(props: CardProps): Partial<SurfaceProps> {
  if (props.collapsible) return {};

  return {
    fill: true,
    onPress: props.onPress,
    accessibilityLabel: props.onPress ? cardLabel(props) : undefined,
  };
}

// Full bleed across the top, its corners cut to the card's.
function CardMedia({ media }: Pick<CardProps, 'media'>): ReactElement | null {
  return media ? (
    <View className="overflow-hidden rounded-t-2xl">{media}</View>
  ) : null;
}
