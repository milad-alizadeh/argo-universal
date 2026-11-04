import { applyListMove } from '@repo/contracts/kit-moves';
import type { Argo } from '@repo/contracts/plugins/argo-api';
import {
  pluginKitExports,
  type PluginKitExport,
} from '@repo/contracts/plugins/kit';
import { PluginEvent, type WireJson } from '@repo/contracts/plugins/wire';
import * as React from 'react';
import type { ElementProps } from './element-props';
import {
  jsx,
  jsxs,
  registerKitComponent,
  type KitElementType,
} from './jsx-runtime';
import * as loader from './loader-pages';
import {
  operationHandlers,
  type OperationHandlers,
  type OperationSend,
} from './operation-handlers';
import {
  mountPages,
  type Pages,
  type ViewSender,
  type DispatchSender,
} from './pages';
import { valuesOf } from './render-tree';
import {
  slotProviders,
  type SlotProviders,
  type SlotSend,
} from './slot-providers';
import { dataClient } from './use-data';
import { viewEffects } from './view-scope';

const hooks = {
  useState: React.useState,
  useReducer: React.useReducer,
  useMemo: React.useMemo,
  useCallback: React.useCallback,
  useRef: React.useRef,
  ...viewEffects,
  useContext: React.useContext,
  createContext: React.createContext,
  memo: React.memo,
};

// A kit component with members is a component carrying them, as `List` carries `List.Section`; the rest are their wire type.
function kitExport({
  component,
  members,
}: PluginKitExport): string | KitElementType {
  if (!Object.keys(members).length) return component;

  const carrier = Object.assign(
    (props: ElementProps) => jsx(component, props),
    members,
  );

  registerKitComponent(carrier, component);

  return carrier;
}

// What `@argo/plugin-kit` exports to a Plugin: its components, React's hooks, the JSX runtime and the List's move rule.
const exportsOf = {
  ...Object.fromEntries(
    pluginKitExports.map((entry) => [entry.name, kitExport(entry)]),
  ),
  ...hooks,
  Fragment: React.Fragment,
  applyListMove,
};

const jsxRuntime = { jsx, jsxs, Fragment: React.Fragment };

export interface Kit {
  exports: typeof exportsOf & Pick<ReturnType<typeof dataClient>, 'useData'>;
  jsxRuntime: typeof jsxRuntime;
  registerPage: Pages['register'];
  // The worker's `argo.slots`; the inbox hands its providers the batched items calls.
  slots: Argo['slots'];
  // `argo.changed()`: the Plugin's pages and items Slots may show something new.
  changed: Argo['changed'];
  // The worker's `argo.operations`; it also answers the Operation calls the inbox hands it.
  operations: OperationHandlers;
  // `argo.pages.define`, which also answers the inbox's draws (ADR-0050).
  loaderPages: loader.LoaderPages;
  inbox: (json: string) => void;
  isElement: typeof React.isValidElement;
  requirePage: Pages['requirePage'];
  // A manifest's `background` path names one of the Plugin's Loader pages.
  requireLoaderPage: (path: string) => void;
  // A `ui.render` Hook's kit components, drawn once as a Render is (ADR-0050).
  drawTree: (element: React.ReactNode) => WireJson;
}

// What the host answers for a Plugin: its Queries, its Slot items, its own Operations and its Loader pages' calls.
type KitCalls = loader.LoaderCalls & {
  slots: SlotSend;
  operations: OperationSend;
};

type DataClient = ReturnType<typeof dataClient>;

// Each part of the kit a host event can be for.
type KitParts = {
  data: DataClient;
  pages: Pages;
  slots: SlotProviders;
  operations: OperationHandlers;
  loaderPages: loader.LoaderPages;
};

// Runs inside a Plugin's context before its code, bundled with the Plugin API (`bundleKit`); the context's `argo` and the `@argo/plugin-kit` module are built from it.
export function createKit(
  send: ViewSender,
  settle: DispatchSender,
  calls: KitCalls,
): Kit {
  const data = dataClient(calls.data);

  const pages = mountPages(send, settle, (viewId) => data.ready(viewId));

  return pageKit({ data, pages, ...providers(calls) });
}

// What a Plugin registers besides its pages: the Slots it answers and the Operations it declares.
function providers(
  calls: KitCalls,
): Pick<KitParts, 'slots' | 'operations' | 'loaderPages'> {
  const loaderPages = loader.loaderPages(calls);
  const operations = operationHandlers(loaderPages.answering(calls.operations));

  return { slots: slotProviders(calls.slots), operations, loaderPages };
}

function pageKit(parts: KitParts): Kit {
  const { data, pages, slots, operations, loaderPages } = parts;

  return {
    isElement: React.isValidElement,
    requirePage: pages.requirePage,
    exports: { ...exportsOf, useData: data.useData },
    jsxRuntime,
    registerPage: pages.register,
    slots: { register: slots.register },
    operations,
    ...loaderKit(loaderPages),
    inbox: inbox(parts),
  };
}

// What Loader pages add to the kit: the pages, their one change signal and the background path check.
const loaderKit = (
  loaderPages: KitParts['loaderPages'],
): Pick<Kit, 'loaderPages' | 'changed' | 'drawTree' | 'requireLoaderPage'> => ({
  loaderPages,
  changed: loaderPages.changed,
  drawTree: valuesOf,
  requireLoaderPage: loaderPages.requireBackground,
});

function inbox(parts: KitParts): Kit['inbox'] {
  return (json): void => deliver(parts, PluginEvent.parse(JSON.parse(json)));
}

// Each event the host sends goes to the part waiting for it; anything else is a page's.
function deliver(parts: KitParts, event: PluginEvent): void {
  if (event.type === 'data') return parts.data.receive(event);

  if (event.type === 'slotItems') return parts.slots.answer(event);

  return answerOrDraw(parts, event);
}

type PartEvent = Exclude<PluginEvent, { type: 'data' | 'slotItems' }>;

const isLoaderEvent = (event: PartEvent): event is loader.LoaderEvent =>
  event.type === 'draw' || event.type === 'read' || event.type === 'stop';

function answerOrDraw(parts: KitParts, event: PartEvent): void {
  if (event.type === 'operation') return parts.operations.answer(event);

  if (isLoaderEvent(event)) return parts.loaderPages.answer(event);

  return parts.pages.receive(event);
}
