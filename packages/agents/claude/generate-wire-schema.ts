import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createGenerator, type Definition } from 'ts-json-schema-generator';

const sdk = path.join(
  import.meta.dirname,
  '../node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts',
);
const sdkVersion: unknown = JSON.parse(
  readFileSync(path.join(path.dirname(sdk), 'package.json'), 'utf8'),
).version;
const generatorVersion: unknown = JSON.parse(
  readFileSync(
    new URL(
      '../node_modules/ts-json-schema-generator/package.json',
      import.meta.url,
    ),
    'utf8',
  ),
).version;
if (typeof sdkVersion !== 'string' || typeof generatorVersion !== 'string')
  throw new Error('Missing installed package version');

const roots = [
  'SDKMessage',
  'SDKControlRequest',
  'SDKControlResponse',
  'SDKControlInitializeResponse',
];
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
writeFileSync(
  new URL('./wire-schema.gen.json', import.meta.url),
  JSON.stringify(
    {
      $schema: 'http://json-schema.org/draft-07/schema#',
      $comment: `Generated from @anthropic-ai/claude-agent-sdk ${sdkVersion} by ts-json-schema-generator ${generatorVersion}; run generate-wire-schema.ts.`,
      definitions,
    },
    null,
    2,
  ) + '\n',
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

writeFileSync(
  new URL('./message-tags.gen.json', import.meta.url),
  JSON.stringify(
    [
      ...new Set(
        (definitions.SDKMessage?.anyOf ?? []).flatMap(referencedMessageTag),
      ),
    ].sort(),
    null,
    2,
  ) + '\n',
);
