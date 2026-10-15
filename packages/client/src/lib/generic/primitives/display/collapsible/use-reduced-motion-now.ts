import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

// Reanimated reads reduced motion once, when the app starts, so a collapsible asks again as it mounts.
export function useReducedMotionNow(): boolean {
  const [reducedMotion, setReducedMotion] = useState(useReducedMotion());
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
  }, []);

  return reducedMotion;
}
