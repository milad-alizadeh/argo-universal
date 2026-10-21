import type * as React from 'react';
import type { ColorValue } from 'react-native';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { symbolPathSize } from '../symbol-path';
import { type TablerSymbol, tablerSymbolPath } from '../tabler-symbols';

export interface TablerSymbolPathProps {
  name: TablerSymbol;
  pixels: number;
  tintColor?: ColorValue;
  testID: string;
}

export function TablerSymbolPath(
  props: TablerSymbolPathProps,
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

function SymbolPathSvg(props: TablerSymbolPathProps): React.JSX.Element {
  const path = tablerSymbolPath(props.name);

  return (
    <Svg {...symbolPathSize(path, props.pixels)} viewBox={path.viewBox}>
      <Path d={path.d} fill={props.tintColor} />
    </Svg>
  );
}
