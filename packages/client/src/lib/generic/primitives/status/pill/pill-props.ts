import type { ViewProps } from 'react-native';
import type { Tone } from '#primitives/content/text';

export interface PillProps extends Omit<ViewProps, 'children' | 'style'> {
  text: string;
  tone?: Tone;
  color?: string;
}
