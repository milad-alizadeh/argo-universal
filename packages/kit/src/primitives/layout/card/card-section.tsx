import type { ReactElement } from 'react';
import { CardContent, CardGroup } from './card-content';
import type { CardProps } from './card-props';

/*
 * A card's header and body drawn on its container's surface, for cards that share one panel and are parted by
 * hairlines rather than each drawn on a Surface of its own.
 */
export function CardSection(props: CardProps): ReactElement {
  return (
    <CardGroup {...props}>
      <CardContent {...props} />
    </CardGroup>
  );
}
