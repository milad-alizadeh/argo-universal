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

const hooks = {
  useState: React.useState,
  useReducer: React.useReducer,
  useMemo: React.useMemo,
  useCallback: React.useCallback,
  useRef: React.useRef,
  useEffect: React.useEffect,
  useLayoutEffect: React.useLayoutEffect,
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
  exports: typeof exportsOf;
  jsxRuntime: typeof jsxRuntime;
  registerPage: Pages['register'];
  registerSlot: Pages['registerSlot'];
  inbox: (json: string) => void;
  isElement: typeof React.isValidElement;
  replacement: (
    invocation: number,
    element: React.ReactNode,
  ) => { treePath: string };
}

// Bundled by esbuild and run inside a Plugin's context before its code (`bundleKit`); the context's `argo` and the `@argo/plugin-kit` module are built from it.
export function createKit(send: ViewSender, settle: DispatchSender): Kit {
  const pages = mountPages(send, settle);

  return {
    isElement: React.isValidElement,
    replacement: replacementOf(pages),
    exports: exportsOf,
    jsxRuntime,
    registerPage: pages.register,
    registerSlot: pages.registerSlot,
    inbox: (json: string): void =>
      pages.receive(PluginEvent.parse(JSON.parse(json))),
  };
}

Object.assign(globalThis, { __argoKit: { createKit } });

function replacementOf(pages: Pages): Kit['replacement'] {
  return (invocation, element) => {
    const treePath = `render:${invocation}`;
    pages.registerReplacement(treePath, element);

    return { treePath };
  };
}
