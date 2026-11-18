import type { ReactElement } from 'react';
import { Path } from 'react-native-svg';
import { SvgSymbolFrame, type SvgSymbolProps } from './svg-symbol-frame';

// The voice button's five bars, as the Voice page of the Paper file draws them: a short, a middle, a tall, a middle and a short bar.
export function VoiceBarsIcon(props: SvgSymbolProps): ReactElement {
  return (
    <SvgSymbolFrame {...props}>
      <Path d="M3 10v4" />
      <Path d="M7.5 7v10" />
      <Path d="M12 4v16" />
      <Path d="M16.5 8.5v7" />
      <Path d="M21 10v4" />
    </SvgSymbolFrame>
  );
}
