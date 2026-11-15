import type { ReactElement } from 'react';
import { Circle, G } from 'react-native-svg';
import { SvgSymbolFrame, type SvgSymbolProps } from './svg-symbol-frame';

const dots = [
  [9, 5],
  [15, 5],
  [9, 12],
  [15, 12],
  [9, 19],
  [15, 19],
] as const;

export function GripIcon(props: SvgSymbolProps): ReactElement {
  return (
    <SvgSymbolFrame {...props}>
      <G fill={props.color ?? 'currentColor'} stroke="none">
        {dots.map(([cx, cy]) => (
          <Circle key={`${cx}:${cy}`} cx={cx} cy={cy} r={1.5} />
        ))}
      </G>
    </SvgSymbolFrame>
  );
}
