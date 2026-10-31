import type { ReactElement } from 'react';
import { FixedSizeChrome } from './fixed-size-chrome';
import { IconButton, type IconButtonProps } from './icon-button';

// An IconButton that is the whole of a fixed-height row's control, so it keeps its size at large text.
export function ChromeIconButton(props: IconButtonProps): ReactElement {
  return (
    <FixedSizeChrome>
      <IconButton {...props} />
    </FixedSizeChrome>
  );
}
