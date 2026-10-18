import type { WirePartDefinition } from '@repo/contracts/plugins/kit';
import type { WireNode, WireJson } from '@repo/contracts/plugins/wire';
import type { ReactNode } from 'react';
import type { PluginUi } from '../plugin-dispatcher';
import type { PluginActions } from './use-plugin-actions';

export type { PluginOnEvent } from '../plugin-dispatcher';

export interface RenderContext {
  key: string;
  ui: PluginUi;
  controls: PluginControls;
  actions: PluginActions;
}

type Callback = (value?: WireJson) => void;

export type ActionProps = Record<string, WireJson | Callback | undefined>;

type PluginProp = ReactNode | WireJson | ActionProps[] | Callback;

export type PluginProps = Record<string, PluginProp>;

export type ControlInput = {
  node: WireNode;
  source: WireNode['props'];
  part: WirePartDefinition;
  context: RenderContext;
};

export type PluginControls = (input: ControlInput) => PluginProps;
