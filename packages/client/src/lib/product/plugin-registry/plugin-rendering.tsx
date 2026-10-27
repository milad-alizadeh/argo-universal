import type { WirePartDefinition } from '@repo/contracts/plugins/kit';
import type { WireNode, WireJson } from '@repo/contracts/plugins/wire';
import type { ReactNode } from 'react';
import type { OpenPluginPage } from '../plugin-actions';

export type { PluginOnEvent } from './plugin-dispatcher';

export interface RenderContext {
  key: string;
  openPage: OpenPluginPage;
  controls: PluginControls;
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
  part: WirePartDefinition;
  context: RenderContext;
};

export type PluginControls = (input: ControlInput) => PluginProps;
