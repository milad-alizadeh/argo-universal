import type { ActivityIndicatorProps, ViewProps } from 'react-native';
import type { IconName } from '../../../symbols/icon-names';
import type { IconRole } from '../../../symbols/icon-role';
import type { SymbolGlyphProps } from '../../../symbols/symbol-glyph/symbol-glyph';

export interface IconProps {
  name: IconName;
  role: IconRole;
  // Selects the platform's filled variant where the icon has one.
  filled?: boolean;
  className?: string;
  weight?: SymbolGlyphProps['weight'];
  testID?: string;
}

// `role` stays the spinner's accessibility role, so its size takes `iconRole`.
export type IconSpinnerProps = Omit<ActivityIndicatorProps, 'size'> & {
  iconRole: IconRole;
};

// A box the size of an icon in that role, its content centred: a spinner, a status ring, or an icon hosted in a native tree.
export type IconSlotProps = Omit<ViewProps, 'role'> & { role: IconRole };
