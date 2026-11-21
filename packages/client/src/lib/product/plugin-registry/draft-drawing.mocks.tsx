import { useEffect, useState, type ReactElement } from 'react';
import { View } from 'react-native';
import type { DraftStep } from './draft-drawing-fixtures';
import { PluginTree } from './plugin-registry';

type StepsProps = {
  steps: DraftStep[];
  shown: number;
  // The regions the Plugin's manifest declares.
  regions?: readonly string[];
};

// The page as a Draft shows it, given each step's tree and naming in turn up to `shown`, one render apart.
export function DraftSteps({
  steps,
  shown,
  regions,
}: StepsProps): ReactElement {
  const [index, setIndex] = useState(0);

  useEffect((): (() => void) | undefined => {
    if (index >= shown) return undefined;

    const timer = setTimeout(() => setIndex(index + 1), 0);

    return (): void => clearTimeout(timer);
  }, [index, shown]);

  const step = steps[Math.min(index, shown)];

  if (!step) throw new Error('No step to draw');

  return (
    <View className="p-8">
      <PluginTree
        root={step.root}
        draft={{ naming: step.naming ?? null, regions }}
      />
    </View>
  );
}
