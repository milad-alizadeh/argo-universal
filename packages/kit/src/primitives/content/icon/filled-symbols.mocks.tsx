import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { Icon } from './icon';

const symbolNames = [
  'sessions',
  'atlas',
  'settings',
  'fast-mode',
  'voice',
  'failed',
  'permission',
] as const;

export function FilledSymbols(): React.JSX.Element {
  const [filled, setFilled] = useState(false);

  return (
    <View className="gap-3">
      <Button
        onPress={() => setFilled(!filled)}
        label={filled ? 'Show outlined icons' : 'Show filled icons'}
      />
      <SymbolRow filled={filled} />
    </View>
  );
}

function SymbolRow({ filled }: { filled: boolean }): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-3">
      {symbolNames.map((name) => (
        <Icon
          key={name}
          name={name}
          size="md"
          filled={filled}
          testID={`fill-${name}`}
        />
      ))}
    </View>
  );
}
