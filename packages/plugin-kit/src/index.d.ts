export type {
  PluginRenderContext,
  PluginSurface,
} from '@repo/contracts/plugins/kit';

import type {
  DeclaredProps,
  Expansion,
  KitDrawing,
  KitMappedProps,
} from '@repo/contracts/kit-props';
import type {
  WirePart,
  WireProps,
  wireParts,
  listPartNames,
} from '@repo/contracts/plugins/kit';
import type { ComponentType, ReactNode, ReactElement } from 'react';

export {
  useState,
  useReducer,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
  useContext,
  createContext,
  memo,
  Fragment,
} from 'react';

type Events<Name extends WirePart> = (typeof wireParts)[Name]['events'];

// Plugin JSX: declared events accept callbacks at their declared place; other nested handlers are built-in Actions.
interface PluginDrawing<Item> extends KitDrawing {
  node: ReactNode;
  choice: string;
  item: Item;
  wireNode: PluginWireNode;
  returns: void | Promise<void>;
  plugin: true;
}

type MappedPluginProps<Props, Name extends WirePart, Item> = KitMappedProps<
  Props,
  Events<Name>,
  never,
  PluginDrawing<Item>
>;

type EventProps<Name extends WirePart, Item = unknown> = MappedPluginProps<
  DeclaredProps<WireProps[Name] & Expansion<(typeof wireParts)[Name]>>,
  Name,
  Item
>;

type SlotChild = ReactElement | boolean | null | undefined;

type SlotProps<Name extends WirePart> = {
  [Slot in keyof (typeof wireParts)[Name]['slots']]?:
    | SlotChild
    | readonly SlotChild[];
};

type Children<Name extends WirePart> =
  (typeof wireParts)[Name]['children'] extends false
    ? { children?: never }
    : { children?: ReactNode };

type Content<Name extends WirePart> = Name extends 'Text'
  ? EventProps<Name>
  : EventProps<Name> & SlotProps<Name> & Children<Name>;

type ListPart = Extract<(typeof listPartNames)[number], WirePart>;

type ListProps<Name extends ListPart, Item> = EventProps<Name, Item> &
  SlotProps<Name> &
  Children<Name>;

type ListComponent<Name extends ListPart> = <Item>(
  props: ListProps<Name, Item>,
) => ReactElement | null;

// Inferred directly from Contracts; adding a schema prop updates Plugin JSX immediately.
export type PluginProps = {
  [Name in WirePart]: Name extends ListPart
    ? ListProps<Name, unknown>
    : Content<Name>;
};

export type PluginComponents = {
  [Name in WirePart]: Name extends ListPart
    ? ListComponent<Name>
    : ComponentType<PluginProps[Name]>;
};

export * from './components';

export type PluginWireNode = {
  [Name in WirePart]: {
    type: Name;
    key: string;
    props: MappedPluginProps<DeclaredProps<WireProps[Name]>, Name, unknown>;
    children: PluginWireNode[];
    slots: Record<string, PluginWireNode[]>;
  };
}[WirePart];

// The timers a Plugin realm provides; Plugin code has no other host globals.
declare global {
  function setTimeout(callback: () => void, ms?: number): number;
  function clearTimeout(id: number | undefined): void;
}

// The Plugin API: the `argo` object a Plugin's `register` receives, inferred from the call schemas in Contracts.
export type { Argo } from '@repo/contracts/plugins/argo-api';

export type {
  Hook,
  HookContext,
  HookNext,
} from '@repo/contracts/plugins/hooks';

export type {
  ProcessResult,
  StorageQuery,
  StorageResult,
} from '@repo/contracts/plugins/argo-calls';

import type { PluginQuery } from '@repo/contracts/plugins/argo-calls';
import type { QueryResult } from '@repo/contracts/plugins/query-results';

export type { PluginQuery } from '@repo/contracts/plugins/argo-calls';

// One definition, shared with the Engine's readers: what a Query answers comes from its api.
export type { QueryResult } from '@repo/contracts/plugins/query-results';

export declare function useData<Query extends PluginQuery>(
  query: Query | null,
  options?: { every?: number },
): {
  data: QueryResult<Query> | undefined;
  error: string | undefined;
  stale: boolean;
  refresh: () => Promise<void>;
};
