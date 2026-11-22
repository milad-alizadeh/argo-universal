import type { ReactElement } from 'react';
import { FixedSizeChrome } from './fixed-size-chrome';
import {
  IconButton,
  type IconButtonProps,
  type IconButtonSize,
} from './icon-button';

/*
 * The one size of a window's chrome controls: the band's sidebar toggle, Back and Forward, and every Screen heading's
 * buttons and Back, in a page or a list column, so a header's buttons match the band above them.
 */
export const chromeControlSize: IconButtonSize = 'md';

// An IconButton that is the whole of a fixed-height row's control, so it keeps its size at large text.
export function ChromeIconButton(props: IconButtonProps): ReactElement {
  return (
    <FixedSizeChrome>
      <IconButton {...props} />
    </FixedSizeChrome>
  );
}
