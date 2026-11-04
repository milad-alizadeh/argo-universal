import type { KitComponentDefinition } from '@repo/contracts/plugins/kit';
import type { MadePageCall } from '@repo/contracts/plugins/page-call-payload';
import type { WireNode, WireJson } from '@repo/contracts/plugins/wire';
import type { ReactNode } from 'react';
import type { z } from 'zod';
import type { OpenPluginPage } from '../plugin-actions';

export type { PluginOnEvent } from './plugin-dispatcher';

/*
 * The Component event a Loader page's call came from: the node's key, the event's name and schema, whose
 * metadata says whether its edits are throttled or it flushes them, and its payload, which a binding puts
 * into the Page state.
 */
export type PageEvent = {
  key: string;
  name: string;
  schema: z.ZodType;
  payload?: WireJson;
};

/*
 * What a Loader page does with a Page state change, an Operation call, a load more or a bound value
 * (ADR-0050), with the event's payload already filled in. A view's tree has none.
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
