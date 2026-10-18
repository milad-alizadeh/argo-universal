import type { IconProps } from '#primitives/content/icon';
import type { Tone } from '#primitives/content/text';

export interface LabelProps {
  icon: IconProps['name'];
  text: string;
  tone?: Tone;
  accessibilityLabel?: string;
  testID?: string;
}
