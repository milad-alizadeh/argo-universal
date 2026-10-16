import * as React from 'react';
import { mountPages, type KitEvent, type ViewSender } from './pages';
import { jsx, jsxs } from './jsx-runtime';

const components = {
  Text: 'Text',
  Button: 'Button',
  Row: 'Row',
  Column: 'Column',
} as const;

// Bundled by esbuild and run inside a Plugin's context before its code (`bundleKit`); the context's `argo` and the `@argo/plugin-kit` module are built from it.
const hooks = {
  useState: React.useState,
  useReducer: React.useReducer,
  useMemo: React.useMemo,
  useCallback: React.useCallback,
  useRef: React.useRef,
  useEffect: React.useEffect,
  useContext: React.useContext,
  createContext: React.createContext,
  memo: React.memo,
};

export function createKit(send: ViewSender): {
  exports: Record<string, unknown>;
  jsxRuntime: Record<string, unknown>;
  registerPage: (path: string, page: () => React.ReactNode) => void;
  inbox: (json: string) => void;
} {
  const pages = mountPages(send);

  return {
    exports: { ...components, ...hooks, Fragment: React.Fragment },
    jsxRuntime: { jsx, jsxs, Fragment: React.Fragment },
    registerPage: pages.register,
    inbox: (json): void => pages.receive(JSON.parse(json) as KitEvent),
  };
}

Object.assign(globalThis, { __argoKit: { createKit } });
