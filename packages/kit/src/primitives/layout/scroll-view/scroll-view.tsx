import { scrollViewDefaults } from '@repo/contracts/kit-tokens';
import { ScrollFadeView } from '../../../scroll-fade/scroll-fade';
import type { KitProps } from '../../kit-props';

export type ScrollViewProps = KitProps<'ScrollView'>;

/*
 * A phone's vertical content keeps a 16 gutter either side and a small gap under the header, as a Screen's other
 * content does, and takes iOS's header inset so its first items rest below a translucent header. A wide window's
 * Screen offers its column, whose padding takes over.
 */
const verticalContent = 'px-4 pt-2 wide:px-0 wide:pt-0';

type ScrollProps = Pick<
  React.ComponentProps<typeof ScrollFadeView>,
  'horizontal' | 'contentContainerClassName' | 'contentInsetAdjustmentBehavior'
>;

const directionProps = (
  direction: ScrollViewProps['direction'],
): ScrollProps =>
  direction === 'horizontal'
    ? { horizontal: true }
    : {
        contentContainerClassName: verticalContent,
        contentInsetAdjustmentBehavior: 'automatic',
      };

export function ScrollView({
  direction = scrollViewDefaults.direction,
  children,
  accessibilityLabel,
}: ScrollViewProps): React.JSX.Element {
  return (
    <ScrollFadeView
      {...directionProps(direction)}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </ScrollFadeView>
  );
}
