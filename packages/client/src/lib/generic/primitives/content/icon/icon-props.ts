import type { ActivityIndicatorProps, ViewProps } from 'react-native';
import type { Tone } from '#primitives/content/text';
import type { IconRole, IconRoleValue } from '../../../symbols/icon-role';
import type { IconSymbol } from '../../../symbols/icon-symbol';
import type { SymbolGlyphProps } from '../../../symbols/symbol-glyph/symbol-glyph-props';

export interface IconProps {
  name: IconSymbol;
  role: IconRoleValue;
  // Selects the platform's filled variant where the icon has one.
  filled?: boolean;
  tone?: Tone;
  className?: string;
  weight?: SymbolGlyphProps['weight'];
  testID?: string;
}

// `role` stays the spinner's accessibility role, so its size takes `iconRole`.
export type IconSpinnerProps = Omit<ActivityIndicatorProps, 'size'> & {
  iconRole: IconRole;
};

// A box the size of an icon in that role, its content centred: a spinner, a status ring, or an icon hosted in a native tree.
export type IconSlotProps = Omit<ViewProps, 'role'> & { role: IconRoleValue };
