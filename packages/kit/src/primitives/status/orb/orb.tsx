import type { ReactElement } from 'react';
import { View } from 'react-native';
import { OrbBoundary } from './orb-boundary';
import { OrbLoader } from './orb-loader';
import type { OrbProps } from './orb-props';

const labels = {
  working: 'Working',
  searching: 'Searching',
  solving: 'Solving',
  listening: 'Listening',
  composing: 'Composing',
  shaping: 'Shaping',
} as const;

export function Orb(props: OrbProps): ReactElement {
  const { state = 'working', accessibilityLabel } = props;

  return (
    <View role="img" accessibilityLabel={accessibilityLabel ?? labels[state]}>
      <OrbBoundary size={props.size}>
        <OrbLoader {...props} />
      </OrbBoundary>
    </View>
  );
}
