import path from 'node:path';
import { createGenerator, type Definition } from 'ts-json-schema-generator';
import { writeGenerated } from '../write-generated.ts';

const sdk = path.join(
  import.meta.dirname,
  '../node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts',
);
const roots = ['SDKMessage'];
const definitions: Record<string, Definition> = Object.assign(
  {},
  ...roots.map(
    (type): object =>
      createGenerator({
        path: sdk,
        tsconfig: path.join(import.meta.dirname, '../tsconfig.json'),
        type,
        jsDoc: 'none',
        additionalProperties: true,
        skipTypeCheck: false,
      }).createSchema(type).definitions ?? {},
  ),
);
function literal(
  definition: Definition | boolean | undefined,
): string | undefined {
  if (typeof definition !== 'object') return undefined;
  return typeof definition.const === 'string' ? definition.const : undefined;
}
function propertyLiteral(
  definition: Definition,
  key: string,
): string | undefined {
  return literal(definition.properties?.[key]);
}
function messageTag(definition: Definition): string[] {
  const type = propertyLiteral(definition, 'type');
  if (!type) return [];
  if (type !== 'system') return [type];
  return systemTag(propertyLiteral(definition, 'subtype'));
}
function systemTag(subtype: string | undefined): string[] {
  return subtype ? [`system/${subtype}`] : [];
}

function referencedMessageTag(reference: Definition | boolean): string[] {
  if (typeof reference !== 'object') return [];
  if (typeof reference.$ref !== 'string') return messageTag(reference);
  return definedMessageTag(
    definitions[reference.$ref.replace('#/definitions/', '')],
  );
}
function definedMessageTag(definition: Definition | undefined): string[] {
  if (!definition) return [];
  if (definition.anyOf) return definition.anyOf.flatMap(referencedMessageTag);
  return messageTag(definition);
}

writeGenerated(
  new URL('./message-tags.gen.json', import.meta.url),
  [
    ...new Set(
      (definitions.SDKMessage?.anyOf ?? []).flatMap(referencedMessageTag),
    ),
  ].sort(),
);
