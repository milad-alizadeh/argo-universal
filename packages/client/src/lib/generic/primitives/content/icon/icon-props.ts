import type { ActivityIndicatorProps, ViewProps } from 'react-native';
import type { IconRole, IconRoleValue } from '../../../symbols/icon-role';
import type { SymbolGlyphProps } from '../../../symbols/symbol-glyph/symbol-glyph-props';
import type { KitProps } from '../../kit-props';

// Kit-only: drawing classes, glyph weight and test identity.
export type IconProps = KitProps<'Icon'> & {
  className?: string;
  weight?: SymbolGlyphProps['weight'];
  testID?: string;
};

export type IconSpinnerProps = Omit<ActivityIndicatorProps, 'size'> & {
  iconRole: IconRole;
};

export type IconSlotProps = Omit<ViewProps, 'role'> & { role: IconRoleValue };
