import { useCallback, useState } from 'react';
import type { ViewInstance } from 'react-native';
import type { ListVisibility } from './list-visibility';

// The browser observer includes clipping by every enclosing scroll view.
export function useListVisibility(): ListVisibility {
  const [visible, setVisible] = useState(false);

  const attach = useCallback((node: ViewInstance | null) => {
    if (!(node instanceof Element)) return;

    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry?.isIntersecting ?? false);
    });

    observer.observe(node);

    return (): void => observer.disconnect();
  }, []);

  return { visible, attach };
}
