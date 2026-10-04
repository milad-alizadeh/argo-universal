import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../src/primitives/text';

export function Variation({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-3">
      <Text variant="muted">{label}</Text>
      {children}
    </View>
  );
}

export function Variations({ children }: { children: ReactNode }) {
  return <View className="w-full max-w-xl gap-6">{children}</View>;
}

export function StorySections({
  sections,
}: {
  sections: Record<string, () => ReactNode>;
}) {
  return (
    <View className="w-full max-w-5xl gap-8 md:flex-row md:flex-wrap">
      {Object.entries(sections).map(([label, render]) => (
        <View key={label} className="w-full md:w-[48%]">
          <Variation label={label}>{render()}</Variation>
        </View>
      ))}
    </View>
  );
}
