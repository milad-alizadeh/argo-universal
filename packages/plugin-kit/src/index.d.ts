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

export { Fragment } from 'react';

type Events<Name extends WireComponentName> =
  (typeof kitComponents)[Name]['events'];

// Plugin JSX: every event, nested ones too, is a value (ADR-0050): a navigation, a Page state change or an Operation call.
interface PluginDrawing extends KitDrawing {
  node: ReactNode;
  choice: string;
  returns: never;
  plugin: true;
}

type MappedPluginProps<Props, Name extends WireComponentName> = KitMappedProps<
  Props,
  Events<Name>,
  never,
  PluginDrawing
>;

type EventProps<
  Name extends WireComponentName,
  Item = unknown,
> = MappedPluginProps<DeclaredProps<WireProps[Name]>, Name> &
  Expansion<(typeof kitComponents)[Name], Item, ReactNode>;

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
    props: MappedPluginProps<DeclaredProps<WireProps[Name]>, Name>;
    children: PluginWireNode[];
    slots: Record<string, PluginWireNode[]>;
  };
}[WireComponentName];

// The timers a Plugin realm provides; Plugin code has no other host globals.
declare global {
  function setTimeout(callback: () => void, ms?: number): number;
  function clearTimeout(id: number | undefined): void;
}

/*
 * The Operations this Plugin's manifest declares. `argo-plugin types <dir>` writes `plugin.gen.d.ts`
 * beside `plugin.json`, which adds each one here, so the handlers `argo.operations.register` takes and
 * the calls `to.run` makes are checked against the manifest. A Plugin that declares none adds nothing.
 */
export interface PluginOperations {}

// The Plugin API and what it hands a Plugin, bound to its declared Operations.
export type {
  Argo,
  Hook,
  HookContext,
  LoaderInput,
  LoaderPage,
  OperationHandler,
  PageTo,
} from './plugin-api';

export type { PageState } from '@repo/contracts/plugins/page-address';

// A Loader page's parts and the paged list its Render reads (ADR-0050).
export type {
  ListPage,
  PagedList,
  RenderInput,
} from '@repo/contracts/plugins/loader-page-api';

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

// One service's OAuth sign-in on Argo's redirect (ADR-0036); `OAuthFlow` says what it does.
export declare const oauthFlow: OAuthFlowPattern;

export type * from '@repo/contracts/plugins/oauth-flow-api';

import type { OAuthFlowPattern } from '@repo/contracts/plugins/oauth-flow-api';

export type { HookNext } from '@repo/contracts/plugins/hooks';

export type {
  ProcessResult,
  StorageQuery,
  StorageResult,
} from '@repo/contracts/plugins/argo-calls';

export type { PluginQuery } from '@repo/contracts/plugins/argo-calls';

// One definition, shared with the Engine's readers: what a Query answers comes from its api.
export type {
  NamedQuery,
  QueriesApi,
  QueryReadContext,
  QueryResult,
} from '@repo/contracts/plugins/query-results';
