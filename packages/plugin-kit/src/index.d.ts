export type {
  PluginRenderContext,
  PluginSurface,
} from '@repo/contracts/plugins/kit';

import type {
  KitChoiceValue,
  KitListItem,
  KitNode,
  KitValuePayload,
} from '@repo/contracts/kit-props';
import type {
  WirePart,
  WireProps,
  wireParts,
  listPartNames,
} from '@repo/contracts/plugins/kit';
import type { WireEvent, WireNode } from '@repo/contracts/plugins/wire';
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

type Expansion<Name extends WirePart> = (typeof wireParts)[Name] extends {
  expansion: infer Schema extends z.ZodType;
}
  ? z.output<Schema>
  : Record<never, never>;

// Handlers go only in top-level props; a nested handler is a built-in Action.
type ExpansionValue<Value, Item> = Value extends WireNode
  ? PluginWireNode
  : Value extends KitChoiceValue
    ? string
    : Value extends WireEvent
      ? never
      : Value extends KitListItem
        ? Item
        : Value extends KitNode
          ? ReactNode
          : Value extends (...args: infer Args) => infer Result
            ? (
                ...args: {
                  [Key in keyof Args]: ExpansionValue<Args[Key], Item>;
                }
              ) => ExpansionValue<Result, Item>
            : Value extends readonly unknown[]
              ? {
                  readonly [Key in keyof Value]: ExpansionValue<
                    Value[Key],
                    Item
                  >;
                }
              : Value extends object
                ? { [Key in keyof Value]: ExpansionValue<Value[Key], Item> }
                : Value;

type MappedPluginProps<
  Props,
  Name extends WirePart,
  Item,
> = Props extends object
  ? {
      [Prop in keyof Props]: Prop extends keyof Events<Name>
        ?
            | ExpansionValue<Exclude<Props[Prop], WireEvent>, Item>
            | Callback<
                ExpansionValue<
                  KitValuePayload<
                    z.output<Extract<Events<Name>[Prop], z.ZodType>>,
                    Props
                  >,
                  Item
                >
              >
        : ExpansionValue<Props[Prop], Item>;
    }
  : Props;

type EventProps<Name extends WirePart, Item = unknown> = MappedPluginProps<
  DeclaredProps<WireProps[Name] & Expansion<Name>>,
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
