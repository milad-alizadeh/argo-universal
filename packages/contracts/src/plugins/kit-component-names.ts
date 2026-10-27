import { kitComponents } from './kit-components';

// The current App draws every kit component on the wire.
const kitComponentNames = Object.keys(kitComponents);

// One `@argo/plugin-kit` export: a kit component, with each dotted one such as `List.Section` as a member of its owner.
export interface PluginKitExport {
  name: string;
  component: string;
  members: Record<string, string>;
}

function membersOf(parent: string): Record<string, string> {
  return Object.fromEntries(
    kitComponentNames.flatMap((name) => {
      const [owner, member] = name.split('.');

      return owner === parent && member ? [[member, name]] : [];
    }),
  );
}

// What the Plugin kit exports, at runtime and in its declarations; both read this list.
export const pluginKitExports: PluginKitExport[] = kitComponentNames
  .filter((name) => !name.includes('.'))
  .map((name) => ({ name, component: name, members: membersOf(name) }));
