import { kitComponents } from './kit-components';
import {
  isKitComponentName,
  kitPropDescriptors,
  type KitPropDescriptor,
} from './kit-prop-descriptors';

// A run of quoted values longer than this is written once under "Value lists" and named where a prop uses it.
const longRun = 8;

// The long runs of quoted values, by their sorted values, so two props that take the same values share one name.
type ValueLists = Map<string, { name: string; values: string[] }>;

const isQuoted = (member: string): boolean => /^'[^']*'$/.test(member);

// A prop that takes an action is a Component event: in a Plugin, a value made by `to`.
const isEvent = (prop: KitPropDescriptor): boolean =>
  prop.members.some((member) => member.endsWith('action object'));

const capitalised = (word: string): string =>
  word.slice(0, 1).toUpperCase() + word.slice(1);

// A list is named for the prop it first appeared on, and numbered when another list has that name.
function listName(lists: ValueLists, prop: string): string {
  const base = capitalised(prop);
  const used = [...lists.values()].filter(({ name }) => name.startsWith(base));

  return used.length === 0 ? base : `${base}${used.length + 1}`;
}

function namedList(lists: ValueLists, prop: KitPropDescriptor): string {
  const values = prop.members.filter(isQuoted);
  const key = [...values].sort().join('|');
  const name = lists.get(key)?.name ?? listName(lists, prop.name);

  lists.set(key, { name, values });

  return [`one of ${name}`, ...prop.members.filter((m) => !isQuoted(m))].join(
    ' | ',
  );
}

function typeOf(lists: ValueLists, prop: KitPropDescriptor): string {
  if (isEvent(prop)) return 'event value';

  const long = prop.members.filter(isQuoted).length > longRun;

  return long ? namedList(lists, prop) : prop.type;
}

function propLine(lists: ValueLists, prop: KitPropDescriptor): string {
  const optional = prop.required ? '' : '?';
  const note = prop.description ? ` — ${prop.description}` : '';

  return `- \`${prop.name}${optional}\`: ${typeOf(lists, prop)}${note}`;
}

type Components = typeof kitComponents;

function heading(name: keyof Components): string {
  const component = kitComponents[name];
  const holds = component.children === false ? 'no children' : 'children';
  const slots = Object.keys(component.slots);
  const named = slots.length ? `; slots: ${slots.join(', ')}` : '';

  return `### ${name}\n\n${component.reference.summary} (${holds}${named})`;
}

function section(lists: ValueLists, name: keyof Components): string {
  const props = isKitComponentName(name) ? kitPropDescriptors(name) : [];

  return [heading(name), ...props.map((prop) => propLine(lists, prop))].join(
    '\n',
  );
}

function valueLists(lists: ValueLists): string {
  const rows = [...lists.values()].map(
    ({ name, values }) => `- **${name}**: ${values.join(', ')}`,
  );

  return ['## Value lists', '', ...rows].join('\n');
}

const names = (): (keyof Components)[] =>
  Object.keys(kitComponents).filter((name): name is keyof Components =>
    Object.hasOwn(kitComponents, name),
  );

/*
 * Every kit component a Plugin can draw, with each prop, read from the schemas the Server checks a tree
 * against, so the reference is the schemas and cannot drift from them.
 */
export function kitReference(): string {
  const lists: ValueLists = new Map();
  const sections = names().map((name) => section(lists, name));

  return [
    '## Kit components',
    '',
    'A prop marked `?` is optional. Import each component from `@argo/plugin-kit`.',
    '',
    sections.join('\n\n'),
    '',
    valueLists(lists),
  ].join('\n');
}
