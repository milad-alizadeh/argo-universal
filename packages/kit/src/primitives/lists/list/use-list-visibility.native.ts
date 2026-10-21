import { useEffect, useState } from 'react';
import { useWindowDimensions, type View } from 'react-native';
import type { ListVisibility } from './list-visibility';
import { observeNativeVisibility } from './native-visibility';

// Host-tree measurements include every enclosing native ScrollView, even outside the kit.
export function useListVisibility(): ListVisibility {
  const [node, attach] = useState<View | null>(null);
  const [visible, report] = useState(false);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (!node) return;

    return observeNativeVisibility({
      node,
      window: { left: 0, top: 0, right: width, bottom: height },
      report,
    });
  }, [node, width, height]);

  return { visible, attach };
}
