import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PinnedFooterKeyboard } from '../pinned-footer/pinned-footer-keyboard';
import { ScreenColumn } from './screen-column';
import type { ScreenProps } from './screen-props';

// What the footer leaves below itself: the home indicator or Android's navigation bar, and a little more.
const footerEnd = 12;

/*
 * A Screen's footer stays at its foot while the body scrolls above it, in the body's column, such as a chat's message
 * field. On a phone it rides above the soft keyboard. A page that runs to the edges keeps its footer in the margins.
 */
export function ScreenFooterFrame(
  props: Pick<ScreenProps, 'footer' | 'width'> & { children: ReactNode },
): ReactNode {
  if (!props.footer) return props.children;

  return (
    <PinnedFooterKeyboard>
      <View className="min-h-0 flex-1">{props.children}</View>
      <ScreenFooter width={props.width}>{props.footer}</ScreenFooter>
    </PinnedFooterKeyboard>
  );
}

function ScreenFooter(props: {
  width: ScreenProps['width'];
  children: ReactNode;
}): ReactElement {
  const { bottom } = useSafeAreaInsets();
  const width = props.width === 'bleed' ? 'full' : props.width;

  return (
    <ScreenColumn width={width}>
      <View className="gap-2 pt-2" style={{ paddingBottom: bottom + footerEnd }}>
        {props.children}
      </View>
    </ScreenColumn>
  );
}
