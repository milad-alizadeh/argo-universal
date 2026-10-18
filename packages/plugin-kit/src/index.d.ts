import type {
  KitSchemaProps,
  KitListItem,
  KitNode,
} from '@repo/contracts/kit-props';
import type {
  WirePart,
  wireParts,
  listPartNames,
} from '@repo/contracts/plugins/kit';
import type { WireEvent } from '@repo/contracts/plugins/wire';
import type { ComponentType, ReactNode, ReactElement } from 'react';
import type { z } from 'zod';

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

type Callback<Payload> = [Payload] extends [undefined]
  ? () => void | Promise<void>
  : (payload: Payload) => void | Promise<void>;

type DeclaredProps<Props> = Props extends object
  ? {
      [Prop in keyof Props as string extends Prop ? never : Prop]: Props[Prop];
    }
  : Props;

type SchemaProps<Name extends WirePart> = DeclaredProps<KitSchemaProps[Name]>;

type ExpansionValue<Value, Item> = Value extends KitListItem
  ? Item
  : Value extends KitNode
    ? ReactNode
    : Value extends (...args: infer Args) => infer Result
      ? (
          ...args: { [Key in keyof Args]: ExpansionValue<Args[Key], Item> }
        ) => ExpansionValue<Result, Item>
      : Value extends readonly (infer Element)[]
        ? readonly ExpansionValue<Element, Item>[]
        : Value;

type MappedPluginProps<
  Props,
  Name extends WirePart,
  Item,
> = Props extends object
  ? {
      [Prop in keyof Props]: Prop extends keyof Events<Name>
        ?
            | Exclude<Props[Prop], WireEvent>
            | Callback<z.output<Extract<Events<Name>[Prop], z.ZodType>>>
        : ExpansionValue<Props[Prop], Item>;
    }
  : Props;

type EventProps<Name extends WirePart, Item = unknown> = MappedPluginProps<
  SchemaProps<Name>,
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
  (typeof wireParts)[Name]['children'] extends true
    ? { children?: ReactNode }
    : { children?: never };

type Content<Name extends WirePart> = Name extends 'Text'
  ? EventProps<Name>
  : EventProps<Name> & SlotProps<Name> & Children<Name>;

type ListPart = (typeof listPartNames)[number];

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

export const Text: PluginComponents['Text'];

export const Button: PluginComponents['Button'];

export const Stack: PluginComponents['Stack'];

export const Row: PluginComponents['Row'];

export const Column: PluginComponents['Column'];

export const GroupedListItem: PluginComponents['GroupedListItem'];

export const VirtualList: PluginComponents['VirtualList'];

export const Table: PluginComponents['Table'];

export const GroupedList: PluginComponents['GroupedList'];

export const Svg: PluginComponents['Svg'];

export const List: PluginComponents['List'] & {
  Section: PluginComponents['List.Section'];
};

export const ListSection: PluginComponents['List.Section'];

export const ListItem: PluginComponents['ListItem'];

export const Label: PluginComponents['Label'];

export const ProgressBar: PluginComponents['ProgressBar'];

export const Pill: PluginComponents['Pill'];

export const EmptyState: PluginComponents['EmptyState'];
