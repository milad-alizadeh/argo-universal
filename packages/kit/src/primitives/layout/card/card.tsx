import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Surface } from '#primitives/layout/surface';
import { CardContent, CardGroup, cardLabel } from './card-content';
import type { CardProps } from './card-props';

export type { CardProps } from './card-props';

// Desktop, web and iOS: Argo draws the card on the card Surface (SwiftUI has no stock card).
export function Card(props: CardProps): ReactElement {
  return (
    <Surface
      kind="card"
      fill
      onPress={props.onPress}
      accessibilityLabel={props.onPress ? cardLabel(props) : undefined}
    >
      <CardGroup {...props}>
        <CardMedia media={props.media} />
        <CardContent {...props} />
      </CardGroup>
    </Surface>
  );
}

// Full bleed across the top, its corners cut to the card's.
function CardMedia({ media }: Pick<CardProps, 'media'>): ReactElement | null {
  return media ? (
    <View className="overflow-hidden rounded-t-2xl">{media}</View>
  ) : null;
}
