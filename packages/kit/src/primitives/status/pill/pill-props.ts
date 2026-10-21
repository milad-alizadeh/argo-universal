import type { ViewProps } from 'react-native';
import type { KitProps } from '../../kit-props';

// Kit-only: native view attributes, without free content or styling.
export type PillProps = KitProps<'Pill'> &
  Omit<ViewProps, keyof KitProps<'Pill'> | 'children' | 'style'>;
