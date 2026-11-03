import type { KitComponentDefinition } from '@repo/contracts/plugins/kit';
import type { WireNode, WireJson } from '@repo/contracts/plugins/wire';
import type { ReactNode } from 'react';
import type { OpenPluginPage } from '../plugin-actions';
import type { DrawnNodes } from './drawn-nodes';

export type { PluginOnEvent } from './plugin-dispatcher';

export interface RenderContext {
  key: string;
  // The same function for the tree's life, so a node drawn before still opens the page its tree opens now.
  openPage: OpenPluginPage;
  controls: PluginControls;
  drawn: DrawnNodes;
}

export type Callback = (value?: WireJson) => void | Promise<void>;

// A prop object may hold a callback, as a Picker's `footerAction` holds `onPress`.
type PluginProp = ReactNode | WireJson | Callback | NestedProps;

interface NestedProps {
  [name: string]: PluginProp;
}

export type PluginProps = Record<string, PluginProp>;

export type ControlInput = {
  node: WireNode;
  source: WireNode['props'];
  definition: KitComponentDefinition;
  context: RenderContext;
};

export type PluginControls = (input: ControlInput) => PluginProps;
