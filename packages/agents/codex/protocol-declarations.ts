import { readFileSync } from 'node:fs';
import path from 'node:path';
interface ProtocolSources {
  directory: string;
  sources: Map<string, string>;
  typeNames: Map<string, string[]>;
  visited: Set<string>;
}
const ownName = (source: string): string | undefined =>
  source.match(/export type (\w+)/)?.[1];
const importedSources = (file: string, source: string): string[] =>
  [...source.matchAll(/import type .* from "([^"]+)";/g)].flatMap(
    (match): string[] =>
      match[1] ? [path.resolve(path.dirname(file), `${match[1]}.ts`)] : [],
  );
const registerSource = (
  state: ProtocolSources,
  file: string,
  source: string,
): void => {
  state.sources.set(file, source);
  const name = ownName(source);
  if (name)
    state.typeNames.set(name, [...(state.typeNames.get(name) ?? []), file]);
};
const visitSource = (state: ProtocolSources, file: string): void => {
  if (state.visited.has(file)) return;
  state.visited.add(file);
  const source = readFileSync(file, 'utf8');
  for (const dependency of importedSources(file, source))
    visitSource(state, dependency);
  registerSource(state, file, source);
};
const nameFor = (state: ProtocolSources, name: string, file: string): string =>
  legacyName(state, name, file) ? `Legacy${name}` : name;
const legacyName = (
  state: ProtocolSources,
  name: string,
  file: string,
): boolean =>
  duplicateName(state, name) && path.dirname(file) === state.directory;
const importedNames = (
  state: ProtocolSources,
  file: string,
  source: string,
): Map<string, string> => {
  const names = new Map<string, string>();
  for (const match of source.matchAll(
    /import type \{ (\w+) \} from "([^"]+)";/g,
  ))
    addImportedName({ state, file, names, match });
  return names;
};
interface ImportName {
  state: ProtocolSources;
  file: string;
  names: Map<string, string>;
  match: RegExpMatchArray;
}
const addImportedName = ({ state, file, names, match }: ImportName): void => {
  const [, name, reference] = match;
  if (!name || !reference) return;
  names.set(
    name,
    nameFor(state, name, path.resolve(path.dirname(file), `${reference}.ts`)),
  );
};
const sourceNames = (
  state: ProtocolSources,
  file: string,
  source: string,
): Map<string, string> => {
  const names = importedNames(state, file, source);
  const name = ownName(source);
  if (name) names.set(name, nameFor(state, name, file));
  return names;
};
const declaration = (
  state: ProtocolSources,
  file: string,
  original: string,
): string => {
  let source = original.replaceAll(/import type .* from "[^"]+";\n/g, '');
  for (const [name, replacement] of sourceNames(state, file, original))
    source = source.replaceAll(new RegExp(`\\b${name}\\b`, 'g'), replacement);
  return source
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .replaceAll(/^\/\/.*\n/gm, '')
    .trim();
};
export function readProtocolDeclarations(
  directory: string,
  roots: string[],
): string[] {
  const state = protocolSources(directory);
  for (const root of roots)
    visitSource(state, path.join(directory, `${root}.ts`));
  return [...state.sources].map(([file, source]): string =>
    declaration(state, file, source),
  );
}

const duplicateName = (state: ProtocolSources, name: string): boolean =>
  (state.typeNames.get(name)?.length ?? 0) > 1;

const protocolSources = (directory: string): ProtocolSources => ({
  directory,
  sources: new Map(),
  typeNames: new Map(),
  visited: new Set(),
});
