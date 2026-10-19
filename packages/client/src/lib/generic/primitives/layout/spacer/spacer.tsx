import { View } from 'react-native';
import type { KitProps } from '../../kit-props';

export type SpacerProps = KitProps<'Spacer'>;

export function Spacer(_props: SpacerProps): React.JSX.Element {
  return <View aria-hidden className="flex-1" />;
}
