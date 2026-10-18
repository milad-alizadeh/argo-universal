import { wireParts } from '@repo/contracts/plugins/kit';
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
  Object.keys(wireParts).map((name) => [name, name]),
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

// What `@argo/plugin-kit` exports to a Plugin: its components, React's hooks and the JSX runtime.
const List = Object.assign((props: ElementProps) => jsx('List', props), {
  Section: 'List.Section',
});

const exportsOf = {
  ...components,
  ...hooks,
  List,
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
}

// Bundled by esbuild and run inside a Plugin's context before its code (`bundleKit`); the context's `argo` and the `@argo/plugin-kit` module are built from it.
export function createKit(send: ViewSender, settle: DispatchSender): Kit {
  const pages = mountPages(send, settle);

  return {
    exports: exportsOf,
    jsxRuntime,
    registerPage: pages.register,
    registerSlot: pages.registerSlot,
    inbox: (json: string): void =>
      pages.receive(PluginEvent.parse(JSON.parse(json))),
  };
}

Object.assign(globalThis, { __argoKit: { createKit } });
