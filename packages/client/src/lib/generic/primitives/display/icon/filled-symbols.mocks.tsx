import { useState } from 'react';
import { View } from 'react-native';
import { Icon } from '../../../symbols/icon';
import { Button } from '../../buttons/button/button';

// Toggles a row of icons between their outlined and filled variants.
export function FilledSymbols(): React.JSX.Element {
  const [filled, setFilled] = useState(false);
  return (
    <View className="gap-3">
      <Button
        onPress={() => setFilled(!filled)}
        label={filled ? 'Show outlined icons' : 'Show filled icons'}
      />
      <View className="flex-row items-center gap-3">
        {(
          [
            'sessions',
            'issue',
            'atlas',
            'settings',
            'fast-mode',
            'voice',
            'failed',
            'permission',
          ] as const
        ).map((name) => (
          <Icon
            key={name}
            name={name}
            role="action"
            filled={filled}
            testID={`fill-${name}`}
          />
        ))}
      </View>
    </View>
  );
}
