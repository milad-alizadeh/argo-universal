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
  WireComponentName,
  WireProps,
  kitComponents,
  listComponentNames,
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

type Events<Name extends WireComponentName> =
  (typeof kitComponents)[Name]['events'];

// Plugin JSX: declared events accept callbacks at their declared place; other nested handlers are built-in Actions.
interface PluginDrawing<Item> extends KitDrawing {
  node: ReactNode;
  choice: string;
  item: Item;
  wireNode: PluginWireNode;
  returns: void | Promise<void>;
  plugin: true;
}

type MappedPluginProps<
  Props,
  Name extends WireComponentName,
  Item,
> = KitMappedProps<Props, Events<Name>, never, PluginDrawing<Item>>;

type EventProps<
  Name extends WireComponentName,
  Item = unknown,
> = MappedPluginProps<
  DeclaredProps<WireProps[Name] & Expansion<(typeof kitComponents)[Name]>>,
  Name,
  Item
>;

type SlotChild = ReactElement | boolean | null | undefined;

type SlotProps<Name extends WireComponentName> = {
  [Slot in keyof (typeof kitComponents)[Name]['slots']]?:
    | SlotChild
    | readonly SlotChild[];
};

type Children<Name extends WireComponentName> =
  (typeof kitComponents)[Name]['children'] extends false
    ? { children?: never }
    : { children?: ReactNode };

type Content<Name extends WireComponentName> = Name extends 'Text'
  ? EventProps<Name>
  : EventProps<Name> & SlotProps<Name> & Children<Name>;

type ListComponentName = Extract<
  (typeof listComponentNames)[number],
  WireComponentName
>;

type ListProps<Name extends ListComponentName, Item> = EventProps<Name, Item> &
  SlotProps<Name> &
  Children<Name>;

// `onMove` moves rows passed as children in a column or lanes, so a List of `items`, a grid or a shelf cannot take it.
type MovesOrItems<Name extends ListComponentName> = Name extends 'List'
  ?
      | { items?: undefined; layout?: 'list' | 'lanes'; direction?: 'vertical' }
      | { onMove?: undefined }
  : unknown;

type ListComponent<Name extends ListComponentName> = <Item>(
  props: ListProps<Name, Item> & MovesOrItems<Name>,
) => ReactElement | null;

// Inferred directly from Contracts; adding a schema prop updates Plugin JSX immediately.
export type PluginProps = {
  [Name in WireComponentName]: Name extends ListComponentName
    ? ListProps<Name, unknown>
    : Content<Name>;
};

export type PluginComponents = {
  [Name in WireComponentName]: Name extends ListComponentName
    ? ListComponent<Name>
    : ComponentType<PluginProps[Name]>;
};

export * from './components.gen';

export type PluginWireNode = {
  [Name in WireComponentName]: {
    type: Name;
    key: string;
    props: MappedPluginProps<DeclaredProps<WireProps[Name]>, Name, unknown>;
    children: PluginWireNode[];
    slots: Record<string, PluginWireNode[]>;
  };
}[WireComponentName];

// The timers a Plugin realm provides; Plugin code has no other host globals.
declare global {
  function setTimeout(callback: () => void, ms?: number): number;
  function clearTimeout(id: number | undefined): void;
}

// The Plugin API: the `argo` object a Plugin's `register` receives, inferred from the call schemas in Contracts.
export type { Argo } from '@repo/contracts/plugins/argo-api';

// The items a Plugin answers an add-only Slot with: Argo draws each one as a row (ADR-0046).
export type {
  ProjectDetailsItem,
  SessionActivityItem,
  SessionRowItem,
} from '@repo/contracts/plugins/wire';

// The List's move rule: applies a move its `onMove` reports, so the board draws the order the List showed.
export {
  applyListMove,
  type ListMove,
  type MovableRow,
  type MovableSection,
} from '@repo/contracts/kit-moves';

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

import type { UseData } from '@repo/contracts/plugins/argo-api';

export type { PluginQuery } from '@repo/contracts/plugins/argo-calls';

// One definition, shared with the Engine's readers: what a Query answers comes from its api.
export type { QueryResult } from '@repo/contracts/plugins/query-results';

export declare const useData: UseData;
