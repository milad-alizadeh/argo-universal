import {
  iconButtonDefaults,
  type IconButtonSize,
} from '@repo/contracts/kit-tokens';
import type { IconButtonProps } from './icon-button';

export const variantOf = (
  props: Pick<IconButtonProps, 'variant'>,
): NonNullable<IconButtonProps['variant']> =>
  props.variant ?? iconButtonDefaults.variant;

export const sizeOf = (props: Pick<IconButtonProps, 'size'>): IconButtonSize =>
  props.size ?? iconButtonDefaults.size;
