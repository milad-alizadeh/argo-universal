import type { ReactElement } from 'react';
import { Path } from 'react-native-svg';
import { SvgSymbolFrame, type SvgSymbolProps } from './svg-symbol-frame';

export function GripIcon(props: SvgSymbolProps): ReactElement {
  return (
    <SvgSymbolFrame {...props}>
      <Path d="M10 5a1 1 0 1 1 -2 0a1 1 0 1 1 2 0" />
      <Path d="M16 5a1 1 0 1 1 -2 0a1 1 0 1 1 2 0" />
      <Path d="M10 12a1 1 0 1 1 -2 0a1 1 0 1 1 2 0" />
      <Path d="M16 12a1 1 0 1 1 -2 0a1 1 0 1 1 2 0" />
      <Path d="M10 19a1 1 0 1 1 -2 0a1 1 0 1 1 2 0" />
      <Path d="M16 19a1 1 0 1 1 -2 0a1 1 0 1 1 2 0" />
    </SvgSymbolFrame>
  );
}
