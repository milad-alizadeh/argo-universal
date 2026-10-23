import type * as React from 'react';
import { Path } from 'react-native-svg';
import { SvgSymbolFrame, type SvgSymbolProps } from './svg-symbol-frame';

export function FileDiffIcon(props: SvgSymbolProps): React.JSX.Element {
  return (
    <SvgSymbolFrame {...props}>
      <Path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <Path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2" />
      <Path d="M12 10l0 4" />
      <Path d="M10 12l4 0" />
      <Path d="M10 17l4 0" />
    </SvgSymbolFrame>
  );
}
