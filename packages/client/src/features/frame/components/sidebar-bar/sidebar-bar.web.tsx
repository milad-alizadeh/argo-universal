import type * as React from 'react';
import { useRef } from 'react';
import { useFrameTransition } from '../../hooks/use-frame-transition.web';
import {
  type SidebarBarProps,
  SidebarBarRow,
  sidebarBarState,
} from './sidebar-bar-row';

const opacityOf = (shown: boolean): Keyframe => ({ opacity: Number(shown) });

/*
 * The list's title and actions in the shared top bar, after the window controls. They only fade with the
 * sidebar, never slide: sliding left would carry them under the traffic lights.
 */
export function SidebarBar(props: SidebarBarProps): React.JSX.Element {
  const bar = useRef<HTMLDivElement>(null);
  useFrameTransition({
    ...props,
    value: props.sidebarShown,
    frames: (from, to) => [[bar.current, [opacityOf(from), opacityOf(to)]]],
  });

  return (
    <div ref={bar} className="absolute top-0" {...sidebarBarState(props)}>
      <SidebarBarRow>{props.children}</SidebarBarRow>
    </div>
  );
}
