import type { ReactElement } from 'react';
import { RadioMark } from '#primitives/inputs/checkbox';
import { Host } from '#primitives/native/host';
import type { ChoiceMarkProps } from './list-item-choice-mark';

export function ChoiceMark(props: ChoiceMarkProps): ReactElement {
  return (
    <Host matchContents>
      <RadioMark selected={!!props.selected} disabled={props.disabled} />
    </Host>
  );
}
