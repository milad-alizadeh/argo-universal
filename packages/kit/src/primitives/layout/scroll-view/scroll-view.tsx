import { ScrollFadeView } from '../../../scroll-fade/scroll-fade';
import type { KitProps } from '../../kit-props';

export type ScrollViewProps = KitProps<'ScrollView'>;

export function ScrollView({
  direction = 'vertical',
  children,
  accessibilityLabel,
}: ScrollViewProps): React.JSX.Element {
  return (
    <ScrollFadeView
      horizontal={direction === 'horizontal'}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </ScrollFadeView>
  );
}
