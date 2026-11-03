import { useLayoutEffect, useState } from 'react';
import type { ViewInstance } from 'react-native';
import { HeightMotion } from './collapsible-height-motion';

type SetView = (view: ViewInstance | null) => void;

export interface WebContentMotion {
  // False once closed content has finished leaving, so it renders nothing.
  mounted: boolean;
  box: SetView;
  content: SetView;
}

const mountsAtStart = (isOpen: boolean, forceMount: boolean): boolean =>
  isOpen || forceMount;

// Content mounts as it opens and stays until its close has finished moving; forced content never leaves.
function useMounted(
  isOpen: boolean,
  forceMount: boolean,
): [boolean, (mounted: false) => void] {
  const [mounted, setMounted] = useState(() =>
    mountsAtStart(isOpen, forceMount),
  );

  if (isOpen && !mounted) setMounted(true);

  return [mounted, setMounted];
}

export function useWebContentMotion(
  isOpen: boolean,
  forceMount = false,
): WebContentMotion {
  const [mounted, setMounted] = useMounted(isOpen, forceMount);
  const [motion] = useState(() => new HeightMotion(isOpen, setMounted));

  useLayoutEffect(() => {
    motion.toggle(isOpen, forceMount);
  }, [motion, isOpen, forceMount, mounted]);

  return { mounted, box: motion.setBox, content: motion.setContent };
}
