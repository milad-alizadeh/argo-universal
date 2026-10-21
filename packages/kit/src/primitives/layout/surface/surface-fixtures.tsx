import { Text } from '#primitives/content/text';
import type { SurfaceProps } from './surface-props';

export const backgroundSurface = {
  kind: 'background',
  padding: 4,
  children: <Text>background</Text>,
} satisfies SurfaceProps;

export const cardSurface = {
  kind: 'card',
  padding: 4,
  children: <Text>card</Text>,
} satisfies SurfaceProps;

export const mutedSurface = {
  kind: 'muted',
  padding: 4,
  children: <Text>muted</Text>,
} satisfies SurfaceProps;

export const glassSurface = {
  kind: 'glass',
  padding: 4,
  children: <Text>glass</Text>,
} satisfies SurfaceProps;

export const tightPaddingSurface = {
  kind: 'card',
  padding: 3,
  children: <Text>Padding 3</Text>,
} satisfies SurfaceProps;

export const loosePaddingSurface = {
  kind: 'card',
  padding: 6,
  children: <Text>Padding 6</Text>,
} satisfies SurfaceProps;
