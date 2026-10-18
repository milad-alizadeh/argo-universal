import { z } from 'zod';
import { partDefinition, propsSchema } from './plugin-reference-format';

function codeName(name: string): string {
  return `\`${name}\``;
}

function addedPropertyNote(added: string[]): string {
  return added.length
    ? ` The latest version adds ${added.map(codeName).join(', ')}.`
    : '';
}

function versionChange(
  name: string,
  latest: number,
  previous: z.ZodType,
): string {
  const older = z.toJSONSchema(previous, { unrepresentable: 'any' });
  const oldProps = new Set(Object.keys(older.properties ?? {}));

  const added = Object.keys(propsSchema(name).properties ?? {}).filter(
    (property) => !oldProps.has(property),
  );

  const note = addedPropertyNote(added);

  return `Current wire version: ${latest}.${note} Older supported versions retain their declared schema.`;
}

export function versionNote(name: string): string {
  const { versions } = partDefinition(name);
  const latest = versions.length;
  const previous = versions[latest - 2];

  return previous
    ? versionChange(name, latest, previous)
    : `Current wire version: ${latest}. No earlier version is listed.`;
}
