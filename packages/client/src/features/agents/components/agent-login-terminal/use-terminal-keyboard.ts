import { useEffect, useState } from 'react';

const keyboardThreshold = 100;

export function useDOMKeyboard(
  compact: boolean,
  nativeKeyboard: boolean,
): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) return;

    const resized = (): void =>
      setVisible(window.innerHeight - viewport.height > keyboardThreshold);

    viewport.addEventListener('resize', resized);

    return (): void => viewport.removeEventListener('resize', resized);
  }, []);

  return compact && (nativeKeyboard || visible);
}
