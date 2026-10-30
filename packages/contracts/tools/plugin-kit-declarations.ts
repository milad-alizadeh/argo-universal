import type { z } from 'zod';
import type { KitComponentDefinition } from '../src/plugins/kit-component-definition';
import {
  kitComponents,
  wireComponentNames,
} from '../src/plugins/kit-components';
import { listComponentNames } from '../src/plugins/list-expansion';
import {
  pluginKitExports,
  type PluginKitExport,
} from '../src/plugins/plugin-kit-exports';
import { componentObjectSchema } from '../src/plugins/plugin-object-schema';

const preamble = `/* Generated from Contracts kit components and prop descriptions by \`pnpm generate:plugin-kit\`. Do not edit by hand. */
import type { ComponentType, ReactElement } from 'react';
import type { PluginComponents, PluginProps } from './index';

// Only the components are exported; the hint types below stay in this file.
export {};

type RequiredProps<Props> = {
  [Prop in keyof Props]-?: Record<never, never> extends Pick<Props, Prop>
    ? never
    : Prop;
}[keyof Props];

type HintValues<Props, Hints> = {
  [Prop in keyof Hints]: Prop extends keyof Props ? Props[Prop] : never;
};

// Keys come from the hints, so editors show each prop's description; the schema still owns values and optionality.
// It distributes over a union of props, so each alternative keeps its own required keys.
type Hinted<Props, Hints> = Props extends unknown
  ? Required<
      Pick<
        HintValues<Props, Hints>,
        Extract<RequiredProps<Props>, keyof Hints>
      >
    > &
      Partial<
        Pick<
          HintValues<Props, Hints>,
          Exclude<Extract<keyof Props, keyof Hints>, RequiredProps<Props>>
        >
      > &
      Omit<Props, keyof Hints>
  : never;
`;

const quoted = (value: string): string =>
  JSON.stringify(value).replaceAll('"', "'");

const propertyKey = (prop: string): string =>
  /^[A-Za-z_$][\w$]*$/.test(prop) ? prop : JSON.stringify(prop);

const hintsName = (component: string): string =>
  `${component.replaceAll('.', '')}Hints`;

type PropertySchema = z.core.JSONSchema._JSONSchema;

const describedAs = (prop: string, schema: PropertySchema): string =>
  (typeof schema === 'object' && schema.description) || prop;

function propertyHint([prop, schema]: [string, PropertySchema]): string {
  const description = describedAs(prop, schema).replaceAll('*/', '* /');

  return `  /** ${description} */\n  ${propertyKey(prop)}: unknown;`;
}

function hints([component, definition]: [
  string,
  KitComponentDefinition,
]): string {
  const { properties } = componentObjectSchema(definition);
  const lines = Object.entries(properties ?? {}).map(propertyHint);

  return `type ${hintsName(component)} = {\n${lines.join('\n')}\n};`;
}

const isList = (component: string): boolean =>
  listComponentNames.some((name) => name === component);

const listValue = (component: string): string =>
  `${component.toLowerCase()}Component`;

function listComponent(component: string): string {
  return `declare const ${listValue(component)}: PluginComponents[${quoted(component)}];`;
}

// A List or Table stays generic over its items.
function componentType(component: string): string {
  if (isList(component))
    return `(<Item>(\n  props: Hinted<Parameters<typeof ${listValue(component)}<Item>>[0], ${hintsName(component)}>,\n) => ReactElement | null)`;

  return `ComponentType<Hinted<PluginProps[${quoted(component)}], ${hintsName(component)}>>`;
}

function declaration({ name, component, members }: PluginKitExport): string {
  const entries = Object.entries(members);

  if (!entries.length)
    return `export const ${name}: ${componentType(component)};`;

  const lines = entries.map(
    ([member, memberComponent]) =>
      `  ${member}: ${componentType(memberComponent)};`,
  );

  return `export const ${name}: ${componentType(component)} & {\n${lines.join('\n')}\n};`;
}

// The Plugin kit's `components.gen.d.ts`: one typed export per entry the kit's runtime exports, each prop carrying its description as a hover hint.
export function pluginKitDeclarations(): string {
  return [
    preamble.trimEnd(),
    wireComponentNames.filter(isList).map(listComponent).join('\n'),
    Object.entries(kitComponents).map(hints).join('\n\n'),
    pluginKitExports.map(declaration).join('\n\n'),
  ]
    .join('\n\n')
    .concat('\n');
}
