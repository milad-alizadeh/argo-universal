import type { WirePartDefinition } from '@repo/contracts/plugins/kit';
import type { WireNode, WireJson } from '@repo/contracts/plugins/wire';
import type { ReactNode } from 'react';
import type { PluginSend } from '../plugin-dispatcher';

export type { PluginOnEvent } from '../plugin-dispatcher';

export interface RenderContext {
  key: string;
  // Set below the tree's root, where a root-only part such as Page is refused.
  nested?: boolean;
  send: PluginSend;
  controls: PluginControls;
}

type Callback = (value?: WireJson) => void;

type PluginProp = ReactNode | WireJson | Callback;

export type PluginProps = Record<string, PluginProp>;

export type ControlInput = {
  node: WireNode;
  source: WireNode['props'];
  part: WirePartDefinition;
  context: RenderContext;
};

export type PluginControls = (input: ControlInput) => PluginProps;
