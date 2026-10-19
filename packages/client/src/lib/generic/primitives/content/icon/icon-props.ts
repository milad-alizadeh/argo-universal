import type { ActivityIndicatorProps, ViewProps } from 'react-native';
import type { IconRole, IconRoleValue } from '../../../symbols/icon-role';
import type { LogoSource } from '../../../symbols/logo-source';
import type { SymbolGlyphProps } from '../../../symbols/symbol-glyph/symbol-glyph-props';
import type { KitProps } from '../../kit-props';

// Kit-only: a logo drawn from its own SVG in place of a named symbol (ADR-0019). It speaks its brand's name.
type IconDrawing =
  | (KitProps<'Icon'> & { source?: never })
  | (Omit<KitProps<'Icon'>, 'name'> & { name?: never; source: LogoSource });

// Kit-only: drawing classes, glyph weight and test identity.
export type IconProps = IconDrawing & {
  className?: string;
  weight?: SymbolGlyphProps['weight'];
  testID?: string;
};

export type IconSpinnerProps = Omit<ActivityIndicatorProps, 'size'> & {
  iconRole: IconRole;
};

export type IconSlotProps = Omit<ViewProps, 'role'> & { role: IconRoleValue };
