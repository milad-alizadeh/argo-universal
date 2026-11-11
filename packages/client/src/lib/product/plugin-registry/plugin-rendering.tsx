import type { KitComponentDefinition } from '@repo/contracts/plugins/kit';
import type { MadePageCall } from '@repo/contracts/plugins/page-call-payload';
import type { PageEvent } from '@repo/contracts/plugins/page-calls';
import type { WireNode, WireJson } from '@repo/contracts/plugins/wire';
import type { ReactNode } from 'react';
import type { OpenPluginPage } from '../plugin-actions';
import type { DrawnNodes } from './drawn-nodes';

/*
 * What a Plugin tree does with a Page state change, an Operation call, a load more or a bound value
 * (ADR-0050), with the event's payload already filled in.
 */
export type OnPageCall = (
  call: MadePageCall,
  event: PageEvent,
) => Promise<void>;

export interface RenderContext {
  key: string;
  openPage: OpenPluginPage;
  controls: PluginControls;
  pageCall?: OnPageCall;
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
