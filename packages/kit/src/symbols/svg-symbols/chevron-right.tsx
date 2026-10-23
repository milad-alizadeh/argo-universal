import type * as React from 'react';
import { Path } from 'react-native-svg';
import { SvgSymbolFrame, type SvgSymbolProps } from './svg-symbol-frame';

export function ChevronRightIcon(props: SvgSymbolProps): React.JSX.Element {
  return (
    <SvgSymbolFrame {...props}>
      <Path d="M9 6l6 6l-6 6" />
    </SvgSymbolFrame>
  );
}
