import type * as React from 'react';
import { Path } from 'react-native-svg';
import { SvgSymbolFrame, type SvgSymbolProps } from './svg-symbol-frame';

export function GitPullRequestIcon(props: SvgSymbolProps): React.JSX.Element {
  return (
    <SvgSymbolFrame {...props}>
      <Path d="M4 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <Path d="M4 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <Path d="M16 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <Path d="M6 8l0 8" />
      <Path d="M11 6h5a2 2 0 0 1 2 2v8" />
      <Path d="M14 9l-3 -3l3 -3" />
    </SvgSymbolFrame>
  );
}
