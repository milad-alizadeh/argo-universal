import type { z } from 'zod';
import { listPartNames } from '../src/plugins/list-expansion';
import { partObjectSchema } from '../src/plugins/plugin-object-schema';
import {
  pluginKitExports,
  type PluginKitExport,
} from '../src/plugins/plugin-part-names';
import type { WirePartDefinition } from '../src/plugins/wire-part-definition';
import { wireParts } from '../src/plugins/wire-parts';

const preamble = `/* Generated from Contracts parts and prop descriptions by \`pnpm docs:build\`. Do not edit by hand. */
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

const hintsName = (part: string): string => `${part.replaceAll('.', '')}Hints`;

type PropertySchema = z.core.JSONSchema._JSONSchema;

const describedAs = (prop: string, schema: PropertySchema): string =>
  (typeof schema === 'object' && schema.description) || prop;

function propertyHint([prop, schema]: [string, PropertySchema]): string {
  const description = describedAs(prop, schema).replaceAll('*/', '* /');

  return `  /** ${description} */\n  ${propertyKey(prop)}: unknown;`;
}

function hints([part, definition]: [string, WirePartDefinition]): string {
  const { properties } = partObjectSchema(definition);
  const lines = Object.entries(properties ?? {}).map(propertyHint);

  return `type ${hintsName(part)} = {\n${lines.join('\n')}\n};`;
}

const isList = (part: string): boolean =>
  listPartNames.some((name) => name === part);

const listValue = (part: string): string => `${part.toLowerCase()}Component`;

function listComponent(part: string): string {
  return `declare const ${listValue(part)}: PluginComponents[${quoted(part)}];`;
}

// A List or Table stays generic over its items.
function component(part: string): string {
  if (isList(part))
    return `(<Item>(\n  props: Hinted<Parameters<typeof ${listValue(part)}<Item>>[0], ${hintsName(part)}>,\n) => ReactElement | null)`;

  return `ComponentType<Hinted<PluginProps[${quoted(part)}], ${hintsName(part)}>>`;
}

function declaration({ name, part, members }: PluginKitExport): string {
  const entries = Object.entries(members);

  if (!entries.length) return `export const ${name}: ${component(part)};`;

  const lines = entries.map(
    ([member, memberPart]) => `  ${member}: ${component(memberPart)};`,
  );

  return `export const ${name}: ${component(part)} & {\n${lines.join('\n')}\n};`;
}

const partNames = Object.keys(wireParts);

// The Plugin kit's `components.d.ts`: one typed export per entry the kit's runtime exports, each prop carrying its description as a hover hint.
export function pluginKitDeclarations(): string {
  return [
    preamble.trimEnd(),
    partNames.filter(isList).map(listComponent).join('\n'),
    Object.entries(wireParts).map(hints).join('\n\n'),
    pluginKitExports.map(declaration).join('\n\n'),
  ]
    .join('\n\n')
    .concat('\n');
}
