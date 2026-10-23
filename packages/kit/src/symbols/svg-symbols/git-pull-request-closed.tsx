import type * as React from 'react';
import { Path } from 'react-native-svg';
import { SvgSymbolFrame, type SvgSymbolProps } from './svg-symbol-frame';

export function GitPullRequestClosedIcon(
  props: SvgSymbolProps,
): React.JSX.Element {
  return (
    <SvgSymbolFrame {...props}>
      <Path d="M4 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <Path d="M4 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <Path d="M16 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <Path d="M6 8v8" />
      <Path d="M18 11v5" />
      <Path d="M16 4l4 4m0 -4l-4 4" />
    </SvgSymbolFrame>
  );
}
