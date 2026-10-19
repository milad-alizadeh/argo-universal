import { Card as MaterialCard, RNHostView } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { useState, type ReactElement } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import { Host } from '#primitives/native/host';
import {
  useMaterialPalette,
  usePressRipple,
} from '#primitives/native/material-palette';
import { CardContent, CardGroup, cardLabel } from './card-content';
import type { CardProps } from './card-props';

export type { CardProps } from './card-props';

/*
 * Android: Material 3's stock filled Card, with its own shape and the card fill. The card draws its
 * React Native content at the width the Host gets, and takes that content's height.
 */
export function Card(props: CardProps): ReactElement {
  const [width, setWidth] = useState<number>();

  const measure = (event: LayoutChangeEvent): void =>
    setWidth(event.nativeEvent.layout.width);

  return (
    <View onLayout={measure}>
      {width === undefined ? null : <MeasuredCard {...props} width={width} />}
    </View>
  );
}

// Compose lays the card out at the measured width; its React Native content wraps at the same width.
function MeasuredCard(props: CardProps & { width: number }): ReactElement {
  const { cardColors } = useMaterialPalette();

  return (
    <Host matchContents={{ vertical: true }} style={{ width: props.width }}>
      <MaterialCard colors={cardColors} modifiers={[fillMaxWidth()]}>
        <RNHostView matchContents>
          <View style={{ width: props.width }}>
            <CardPress {...props} />
          </View>
        </RNHostView>
      </MaterialCard>
    </Host>
  );
}

// A pressable card ripples across its whole shape; the Card clips the ripple and the media to it.
function CardPress(props: CardProps): ReactElement {
  const ripple = usePressRipple();

  if (!props.onPress)
    return (
      <CardGroup {...props}>
        <CardBody {...props} />
      </CardGroup>
    );

  return (
    <Pressable
      role="button"
      accessibilityLabel={cardLabel(props)}
      android_ripple={ripple}
      onPress={props.onPress}
    >
      <CardBody {...props} />
    </Pressable>
  );
}

function CardBody(props: CardProps): ReactElement {
  return (
    <>
      {props.media}
      <CardContent {...props} />
    </>
  );
}
