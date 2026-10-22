import type { ActivityIndicatorProps, ViewProps } from 'react-native';
import type { IconSize, IconSizeValue } from '../../../symbols/icon-size';
import type { LogoSource } from '../../../symbols/logo-source';
import type { KitProps } from '../../kit-props';

// Kit-only: a logo drawn from its own SVG in place of a named symbol (ADR-0019). It speaks its brand's name.
type IconDrawing =
  | (KitProps<'Icon'> & { source?: never })
  | (Omit<KitProps<'Icon'>, 'name'> & { name?: never; source: LogoSource });

// Kit-only: drawing classes and test identity.
export type IconProps = IconDrawing & {
  className?: string;
  testID?: string;
};

export type IconSpinnerProps = Omit<ActivityIndicatorProps, 'size'> & {
  iconSize: IconSize;
};

export type IconSlotProps = ViewProps & { size: IconSizeValue };
