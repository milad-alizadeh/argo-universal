import type { KitComponentDefinition } from '@repo/contracts/plugins/kit';
import type {
  PageCall,
  WireNode,
  WireJson,
} from '@repo/contracts/plugins/wire';
import type { ReactNode } from 'react';
import type { OpenPluginPage } from '../plugin-actions';

export type { PluginOnEvent } from './plugin-dispatcher';

// What a Loader page does with a Page state change or an Operation call (ADR-0050); a view's tree has none.
export type OnPageCall = (call: PageCall) => Promise<void>;

export interface RenderContext {
  key: string;
  openPage: OpenPluginPage;
  controls: PluginControls;
  pageCall?: OnPageCall;
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
