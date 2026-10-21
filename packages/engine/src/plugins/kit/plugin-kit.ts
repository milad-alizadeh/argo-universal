import {
  pluginKitExports,
  type PluginKitExport,
} from '@repo/contracts/plugins/kit';
import { PluginEvent } from '@repo/contracts/plugins/wire';
import * as React from 'react';
import type { ElementProps } from './element-props';
import { jsx, jsxs } from './jsx-runtime';
import {
  mountPages,
  type Pages,
  type ViewSender,
  type DispatchSender,
} from './pages';
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

type KitComponent =
  | string
  | (((props: ElementProps) => ReturnType<typeof jsx>) &
      Record<string, string>);

// A part with members is a component carrying them, as `List` carries `List.Section`; the rest are their wire type.
function kitComponent({ part, members }: PluginKitExport): KitComponent {
  if (!Object.keys(members).length) return part;

  return Object.assign((props: ElementProps) => jsx(part, props), members);
}

// What `@argo/plugin-kit` exports to a Plugin: its components, React's hooks and the JSX runtime.
const exportsOf = {
  ...Object.fromEntries(
    pluginKitExports.map((entry) => [entry.name, kitComponent(entry)]),
  ),
  ...hooks,
  Fragment: React.Fragment,
};

const jsxRuntime = { jsx, jsxs, Fragment: React.Fragment };

export interface Kit {
  exports: typeof exportsOf & Pick<ReturnType<typeof dataClient>, 'useData'>;
  jsxRuntime: typeof jsxRuntime;
  registerPage: Pages['register'];
  registerSlot: Pages['registerSlot'];
  inbox: (json: string) => void;
  isElement: typeof React.isValidElement;
  requirePage: Pages['requirePage'];
  replacement: (
    invocation: number,
    element: React.ReactNode,
  ) => { treePath: string };
}

// Runs inside a Plugin's context before its code, bundled with the Plugin API (`bundleKit`); the context's `argo` and the `@argo/plugin-kit` module are built from it.
export function createKit(
  send: ViewSender,
  settle: DispatchSender,
  call: Parameters<typeof dataClient>[0],
): Kit {
  const data = dataClient(call);

  const pages = mountPages(send, settle, (viewId, background) =>
    data.ready(viewId, background),
  );

  return pageKit(data, pages);
}

function pageKit(data: ReturnType<typeof dataClient>, pages: Pages): Kit {
  return {
    isElement: React.isValidElement,
    requirePage: pages.requirePage,
    replacement: replacementOf(pages),
    exports: { ...exportsOf, useData: data.useData },
    jsxRuntime,
    registerPage: pages.register,
    registerSlot: pages.registerSlot,
    inbox: inbox(data, pages),
  };
}

function inbox(
  data: ReturnType<typeof dataClient>,
  pages: Pages,
): Kit['inbox'] {
  return (json): void => {
    const event = PluginEvent.parse(JSON.parse(json));

    if (event.type === 'data') data.receive(event);
    else pages.receive(event);
  };
}

function replacementOf(pages: Pages): Kit['replacement'] {
  return (invocation, element) => {
    const treePath = `render:${invocation}`;
    pages.registerReplacement(treePath, element);

    return { treePath };
  };
}
