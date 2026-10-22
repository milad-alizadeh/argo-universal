import type { ButtonProps as ExpoButtonProps } from '@expo/ui';
import { size } from '@expo/ui/jetpack-compose/modifiers';
import type { controlSize } from '@expo/ui/swift-ui/modifiers';
import type { IconRole } from '../../../symbols/icon-role';
import type { IconButtonProps } from './icon-button';

type IconButtonSize = NonNullable<IconButtonProps['size']>;

type Modifiers = NonNullable<ExpoButtonProps['modifiers']>;

type ControlSize = Parameters<typeof controlSize>[0];

const extraSmallBox = 20;

const smallBox = 24;

const mediumBox = 32;

const largeBox = 40;

const extraLargeBox = 48;

const composeSize = (box: number): Modifiers[number] => size(box, box);

export const sizes = {
  xs: {
    iconRole: 'code',
    iosControlSize: 'mini',
    androidModifiers: [composeSize(extraSmallBox)],
    webClass: 'size-5',
  },
  sm: {
    iconRole: 'secondary',
    iosControlSize: 'small',
    androidModifiers: [composeSize(smallBox)],
    webClass: 'size-6',
  },
  md: {
    iconRole: 'body',
    iosControlSize: 'regular',
    androidModifiers: [composeSize(mediumBox)],
    webClass: 'size-8',
  },
  lg: {
    iconRole: 'action',
    iosControlSize: 'large',
    androidModifiers: [composeSize(largeBox)],
    webClass: 'size-10',
  },
  xl: {
    iconRole: 'nav',
    iosControlSize: 'extraLarge',
    androidModifiers: [composeSize(extraLargeBox)],
    webClass: 'size-12',
  },
} satisfies Record<
  IconButtonSize,
  {
    iconRole: IconRole;
    iosControlSize: ControlSize;
    androidModifiers: Modifiers;
    webClass: string;
  }
>;
