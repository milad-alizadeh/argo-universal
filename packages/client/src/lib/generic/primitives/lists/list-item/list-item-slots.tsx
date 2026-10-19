import type { ReactElement } from 'react';
import { TextClassContext } from '#primitives/content/text';
import { ItemContent, trailsTitle } from './list-item-content';
import { Accessory, Control, Leading, Trailing } from './list-item-parts';
import type { DrawingProps } from './list-item-press-props';

// The row's lanes in order: a menu's check, leading, title, trailing, accessory, and a control on its own line.
export function ItemContentSlots(props: DrawingProps): ReactElement {
  return (
    <TextClassContext value={undefined}>
      {props.choice}
      <Leading {...props} />
      {props.content ?? <ItemContent {...props} />}
      {trailsTitle(props) ? null : <Trailing {...props} />}
      <Accessory>{props.accessory}</Accessory>
      <Control>{props.control}</Control>
    </TextClassContext>
  );
}
