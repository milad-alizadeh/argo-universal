import {
  pluginKitExports,
  type PluginKitExport,
} from '../src/plugins/plugin-part-names';

const preamble = `/* Generated from Contracts part names by \`pnpm docs:build\`. Do not edit by hand. */
import type { PluginComponents } from './index';
`;

const component = (part: string): string =>
  `PluginComponents[${JSON.stringify(part).replaceAll('"', "'")}]`;

function declaration({ name, part, members }: PluginKitExport): string {
  const entries = Object.entries(members);

  if (!entries.length) return `export const ${name}: ${component(part)};`;
  const lines = entries.map(
    ([member, memberPart]) => `  ${member}: ${component(memberPart)};`,
  );

  return `export const ${name}: ${component(part)} & {\n${lines.join('\n')}\n};`;
}

// The Plugin kit's `components.d.ts`: one typed export per entry the kit's runtime exports.
export function pluginKitDeclarations(): string {
  return `${preamble}\n${pluginKitExports.map(declaration).join('\n\n')}\n`;
}
