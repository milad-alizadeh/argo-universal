import type * as React from 'react';
import { Path } from 'react-native-svg';
import { SvgSymbolFrame, type SvgSymbolProps } from './svg-symbol-frame';

export function GitMergeIcon(props: SvgSymbolProps): React.JSX.Element {
  return (
    <SvgSymbolFrame {...props}>
      <Path d="M5 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <Path d="M5 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <Path d="M15 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <Path d="M7 8l0 8" />
      <Path d="M7 8a4 4 0 0 0 4 4h4" />
    </SvgSymbolFrame>
  );
}
