import type { KitComponentDefinition } from '@repo/contracts/plugins/kit';
import type {
  PageCall,
  WireNode,
  WireJson,
} from '@repo/contracts/plugins/wire';
import type { ReactNode } from 'react';
import type { OpenPluginPage } from '../plugin-actions';

export type { PluginOnEvent } from './plugin-dispatcher';

/*
 * What a Loader page does with a Page state change, an Operation call, a load more or a bound value
 * (ADR-0050); `value` is the Component event's own, which a binding puts into the Page state. A view's tree has none.
 */
export type OnPageCall = (call: PageCall, value?: WireJson) => Promise<void>;

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
