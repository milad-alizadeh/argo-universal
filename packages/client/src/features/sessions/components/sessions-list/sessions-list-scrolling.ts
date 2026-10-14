import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// Scroll events stop for this long before the list counts as at rest.
const scrollSettleMilliseconds = 150;

type ListScrolling = { scrolling: boolean; onScroll: () => void };

// Whether the web list is scrolling: it changes once when a scroll starts and once when it settles, never per frame.
export function useScrolling(): ListScrolling {
  const [scrolling, setScrolling] = useState(false);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => (): void => clearTimeout(settle.current ?? 0), []);

  const onScroll = useCallback(() => {
    if (Platform.OS !== 'web') return;
    setScrolling(true);
    clearTimeout(settle.current ?? 0);
    settle.current = setTimeout(
      () => setScrolling(false),
      scrollSettleMilliseconds,
    );
  }, []);

  return { scrolling, onScroll };
}
