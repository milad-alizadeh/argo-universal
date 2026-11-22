import { pressEventOf } from '@repo/contracts/kit-presses';
import type { IconButtonProps } from './icon-button';

// The handler a press runs: the one for switching back while the button is drawn selected, if it has one.
export const pressOf = (props: IconButtonProps): IconButtonProps['onPress'] =>
  props[pressEventOf(props)];
