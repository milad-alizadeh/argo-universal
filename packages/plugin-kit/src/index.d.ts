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

// Plugin JSX: a handler goes beside the value it replaces, only in top-level props; a nested handler is a built-in Action.
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
