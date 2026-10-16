import type { HostConfig } from 'react-reconciler';
import type { ElementProps } from './element-props';
import type { Instance } from './wire-tree';

// Nothing in a Plugin page is a text node, a suspense boundary or a portal: text goes through the `Text` component.
export type KitHostConfig = HostConfig<
  string,
  ElementProps,
  Instance,
  Instance,
  never,
  never,
  never,
  never,
  Instance,
  Record<string, never>,
  never,
  ReturnType<typeof setTimeout>,
  -1,
  null
>;

export type TransitionContext = KitHostConfig['HostTransitionContext'];
