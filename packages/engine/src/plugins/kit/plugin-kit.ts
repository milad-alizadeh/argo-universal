import { kitCompounds, pluginPartNames } from '@repo/contracts/plugins/kit';
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

const components = Object.fromEntries(
  pluginPartNames.map((name) => [name, name]),
);

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

// A compound such as Metadata draws its root and carries its members, such as Metadata.Label.
const compounds = Object.fromEntries(
  Object.entries(kitCompounds).map(([root, members]) => [
    root,
    Object.assign(
      (props: ElementProps) => jsx(root, props),
      Object.fromEntries(members.map((member) => [member, `${root}.${member}`])),
    ),
  ]),
);

// What `@argo/plugin-kit` exports to a Plugin: its components, React's hooks and the JSX runtime.
const exportsOf = {
  ...components,
  ...hooks,
  ...compounds,
  ListSection: 'List.Section',
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
