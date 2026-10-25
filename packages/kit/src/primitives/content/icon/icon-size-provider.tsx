import type * as React from 'react';
import { useContext } from 'react';
import type { IconSizeValue } from '../../../symbols/icon-size';
import { IconSizeContext } from './icon-size-context';

export interface IconSizeProviderProps {
  size: IconSizeValue;
  children: React.ReactNode;
}

// A control's default icon size; an icon that names its own size keeps it, and a fixed size outside it still wins.
export function IconSizeProvider(
  props: IconSizeProviderProps,
): React.JSX.Element {
  const outside = useContext(IconSizeContext);
  const sizing = { size: props.size, fixed: false };

  return (
    <IconSizeContext value={outside?.fixed ? outside : sizing}>
      {props.children}
    </IconSizeContext>
  );
}
