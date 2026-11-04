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
import { oauthFlow } from './oauth-flow';
import {
  operationHandlers,
  type OperationHandlers,
  type OperationSend,
} from './operation-handlers';
import { valuesOf } from './render-tree';
import {
  slotProviders,
  type SlotProviders,
  type SlotSend,
} from './slot-providers';

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

// What `@argo/plugin-kit` exports to a Plugin: its components, the JSX runtime, the List's move rule and the OAuth flow.
const exportsOf = {
  ...Object.fromEntries(
    pluginKitExports.map((entry) => [entry.name, kitExport(entry)]),
  ),
  Fragment: React.Fragment,
  applyListMove,
  oauthFlow,
};

const jsxRuntime = { jsx, jsxs, Fragment: React.Fragment };

export interface Kit {
  exports: typeof exportsOf;
  jsxRuntime: typeof jsxRuntime;
  // The worker's `argo.slots`; the inbox hands its providers the batched items calls.
  slots: Argo['slots'];
  // `argo.changed()`: the Plugin's pages and items Slots may show something new.
  changed: Argo['changed'];
  // The worker's `argo.operations`; it also answers the Operation calls the inbox hands it.
  operations: OperationHandlers;
  // `argo.pages.define`, which also answers the inbox's draws (ADR-0050).
  loaderPages: loader.WorkerPages;
  inbox: (json: string) => void;
  isElement: typeof React.isValidElement;
  // A manifest's `background` path and `contributes.accounts` pages name the Plugin's Loader pages.
  requireLoaderPage: loader.WorkerPages['requirePage'];
  // A `ui.render` Hook's kit components, drawn once as a Render is (ADR-0050).
  drawTree: (element: React.ReactNode) => WireJson;
}

// What the host answers for a Plugin: its Queries, its Slot items, its own Operations and its Loader pages' calls.
type KitCalls = loader.LoaderCalls & {
  slots: SlotSend;
  operations: OperationSend;
};

// Each part of the kit a host event can be for.
type KitParts = {
  slots: SlotProviders;
  operations: OperationHandlers;
  loaderPages: loader.WorkerPages;
};

// Runs inside a Plugin's context before its code, bundled with the Plugin API (`bundleKit`); the context's `argo` and the `@argo/plugin-kit` module are built from it.
export function createKit(calls: KitCalls): Kit {
  const parts = kitParts(calls);
  const { slots, operations, loaderPages } = parts;

  return {
    ...modules,
    slots: { register: slots.register },
    operations,
    loaderPages,
    changed: loaderPages.changed,
    requireLoaderPage: loaderPages.requirePage,
    inbox: (json) => deliver(parts, PluginEvent.parse(JSON.parse(json))),
  };
}

// The parts a host event can be for; an Operation's answer also says which pages it changed.
function kitParts(calls: KitCalls): KitParts {
  const loaderPages = loader.loaderPages(calls);
  const operations = operationHandlers(loaderPages.answering(calls.operations));

  return { slots: slotProviders(calls.slots), operations, loaderPages };
}

// What the kit holds the same for every Plugin: its modules and how it reads a tree.
const modules = {
  isElement: React.isValidElement,
  exports: exportsOf,
  jsxRuntime,
  drawTree: valuesOf,
} satisfies Partial<Kit>;

// Each event the host sends goes to the part waiting for it.
function deliver(parts: KitParts, event: PluginEvent): void {
  if (event.type === 'slotItems') return parts.slots.answer(event);

  if (event.type === 'operation') return parts.operations.answer(event);

  return parts.loaderPages.answer(event);
}
