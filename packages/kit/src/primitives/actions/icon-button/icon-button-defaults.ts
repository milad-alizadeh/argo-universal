import {
  iconButtonDefaults,
  type IconButtonSize,
} from '@repo/contracts/kit-tokens';
import type { IconButtonProps } from './icon-button';

export const variantOf = (
  props: IconButtonProps,
): NonNullable<IconButtonProps['variant']> =>
  props.variant ?? iconButtonDefaults.variant;

export const sizeOf = (props: IconButtonProps): IconButtonSize =>
  props.size ?? iconButtonDefaults.size;
