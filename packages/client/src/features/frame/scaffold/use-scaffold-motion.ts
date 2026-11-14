import { useState } from 'react';
import {
  type FrameMotion,
  frameTiming,
  transitionKeyOf,
} from '../utils/frame-timing';
import type { FrameLayout } from './frame-layout';
import { isFramed } from './is-framed';
import type { ScaffoldProps } from './scaffold-props';
import { useSessionSwitch } from './use-session-switch';

interface ScaffoldMotion {
  motion: FrameMotion;
  setResizing: (resizing: boolean) => void;
}

// The phone shell draws no Frame, so only a change of the sidebar's state moves its page.
const transitionKey = (scaffold: ScaffoldProps, layout: FrameLayout): string =>
  isFramed(scaffold.sizeClass)
    ? layout.transitionKey
    : transitionKeyOf({ sidebarShown: scaffold.sidebarShown });

const bandSessionId = (band: ScaffoldProps['band']): string | undefined =>
  band?.session?.sessionId;

// A divider drag and a Session switch move the Frame at once.
export function useScaffoldMotion(
  scaffold: ScaffoldProps,
  layout: FrameLayout,
): ScaffoldMotion {
  const [resizing, setResizing] = useState(false);
  const switching = useSessionSwitch(bandSessionId(scaffold.band));
  const key = transitionKey(scaffold, layout);
  const animate = !resizing && !switching;

  return {
    motion: { transitionKey: key, animate, timing: frameTiming },
    setResizing,
  };
}
