import type {
  PartBinding,
  PartUi,
  WirePartDefinition,
} from '@repo/contracts/plugins/kit';
import type { Handler, WireJson, WireNode } from '@repo/contracts/plugins/wire';
import type { ReactNode } from 'react';
import type { NodeControls } from './plugin-node-controls';
import type { RenderContext } from './plugin-rendering';

export type PluginCallback = (payload?: WireJson) => void;

export type PluginProp =
  | ReactNode
  | PluginCallback
  | PluginProp[]
  | { [name: string]: PluginProp };

export type PluginProps = Record<string, PluginProp>;

export type ControlInput = {
  node: WireNode;
  part: WirePartDefinition;
  context: RenderContext;
  ui: Required<PartUi>;
};

export type EventInput = ControlInput & { path: string[]; handler?: Handler };

export type ControlChange = EventInput & {
  event: string;
  payload: WireJson | undefined;
  binding?: PartBinding;
};

export type LocalControl = { state: NodeControls; update: () => void };
