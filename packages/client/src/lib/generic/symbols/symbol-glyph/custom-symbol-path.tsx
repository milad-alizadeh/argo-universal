import type * as React from 'react';
import type { ColorValue } from 'react-native';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  customSymbolPath,
  customSymbolSize,
  type TablerSymbol,
} from '../custom-symbols';

export interface CustomSymbolPathProps {
  sf: TablerSymbol;
  pixels: number;
  tintColor?: ColorValue;
  testID: string;
}

// A Tabler symbol drawn from its path, sized and centred in the icon's box as the custom symbols are on Apple platforms.
export function CustomSymbolPath(
  props: CustomSymbolPathProps,
): React.JSX.Element {
  const box = { width: props.pixels, height: props.pixels };

  return (
    <View
      testID={props.testID}
      style={box}
      className="items-center justify-center"
    >
      <SymbolPathSvg {...props} />
    </View>
  );
}

function SymbolPathSvg(props: CustomSymbolPathProps): React.JSX.Element {
  const { viewBox, d } = customSymbolPath(props.sf);

  return (
    <Svg {...customSymbolSize(props.sf, props.pixels)} viewBox={viewBox}>
      <Path d={d} fill={props.tintColor} />
    </Svg>
  );
}
