import type * as React from 'react';
import { Path } from 'react-native-svg';
import { SvgSymbolFrame, type SvgSymbolProps } from './svg-symbol-frame';

export function GitPullRequestConflictIcon(
  props: SvgSymbolProps,
): React.JSX.Element {
  return (
    <SvgSymbolFrame {...props}>
      <Path d="M16 18a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
      <Path d="M11 6h5a2 2 0 0 1 2 2v8" />
      <Path d="M4 18a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
      <Path d="M6 11v5" />
      <Path d="M4 4l4 4" />
      <Path d="M8 4l-4 4" />
    </SvgSymbolFrame>
  );
}
