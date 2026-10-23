import type * as React from 'react';
import { Path } from 'react-native-svg';
import { SvgSymbolFrame, type SvgSymbolProps } from './svg-symbol-frame';

export function GitCommitIcon(props: SvgSymbolProps): React.JSX.Element {
  return (
    <SvgSymbolFrame {...props}>
      <Path d="M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
      <Path d="M12 3l0 6" />
      <Path d="M12 15l0 6" />
    </SvgSymbolFrame>
  );
}
