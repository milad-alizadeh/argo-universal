import type {
  WireProps,
  WirePart,
  wireParts,
} from '@repo/contracts/plugins/kit';
import type { WireEvent } from '@repo/contracts/plugins/wire';
import type { ComponentType, ReactNode } from 'react';
import type { z } from 'zod';

export {
  useState,
  useReducer,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useContext,
  createContext,
  memo,
  Fragment,
} from 'react';

type Events<Name extends WirePart> = (typeof wireParts)[Name]['events'];

type Callback<Payload> = [Payload] extends [undefined]
  ? () => void | Promise<void>
  : (payload: Payload) => void | Promise<void>;

type EventProps<Name extends WirePart> = {
  [Prop in keyof WireProps[Name]]: Prop extends keyof Events<Name>
    ?
        | Exclude<WireProps[Name][Prop], WireEvent>
        | Callback<z.output<Extract<Events<Name>[Prop], z.ZodType>>>
    : WireProps[Name][Prop];
};

type Content<Name extends WirePart> = Name extends 'Text' | 'Button'
  ? Omit<EventProps<Name>, 'label'> &
      (
        | { label: string; children?: never }
        | { label?: never; children: string | number | (string | number)[] }
      )
  : EventProps<Name> & { children?: ReactNode };

// Inferred directly from Contracts; adding a schema prop updates Plugin JSX immediately.
export type PluginProps = { [Name in WirePart]: Content<Name> };

export type PluginComponents = {
  [Name in WirePart]: ComponentType<PluginProps[Name]>;
};

export const Text: PluginComponents['Text'];

export const Button: PluginComponents['Button'];

export const Stack: PluginComponents['Stack'];

export const Row: PluginComponents['Row'];

export const Column: PluginComponents['Column'];
